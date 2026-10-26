import { randomUUID } from 'crypto';
import prisma from '../config/db.js';
import { logAudit, logAuditQuietly } from './stokvelRecordsController.js';
import { ensureLedgerTables, lockStokvelLedger, postEntryWithBalanceTx } from '../services/ledgerService.js';
import { toCents } from '../utils/money.js';
import { parseTerms, buildSchedule, totalDueFor } from '../utils/loanTerms.js';

// Loans, trade credit and statements for a stokvel. Like the records
// controller, there is no migration history, so tables are created lazily
// with IF NOT EXISTS guards and queried with raw SQL.

async function createTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "StokvelLoan" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "stokvelId" TEXT NOT NULL,
      "borrowerId" TEXT NOT NULL,
      "amount" DECIMAL(12,2) NOT NULL,
      "interestPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
      "repayMonths" INTEGER NOT NULL,
      "reason" TEXT,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "decidedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  // Borrower agreement: loans are unsecured, so every request carries a photo
  // of the borrower, an optional ID photo, a finger-drawn signature and the
  // time they accepted the terms. Officials can see these; other members cannot.
  // rateBasis and termsSnapshot freeze the agreed terms on each loan.
  for (const col of ['"borrowerPhone" TEXT', '"borrowerPhoto" TEXT', '"idPhoto" TEXT', '"signature" TEXT', '"agreedAt" TIMESTAMP(3)', '"rateBasis" TEXT', '"termsSnapshot" JSONB']) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "StokvelLoan" ADD COLUMN IF NOT EXISTS ${col};`);
  }
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS "StokvelLoan_stokvelId_idx" ON "StokvelLoan" ("stokvelId", "createdAt");'
  );
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "StokvelLoanVote" (
      "loanId" TEXT NOT NULL,
      "officialId" TEXT NOT NULL,
      "approve" BOOLEAN NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY ("loanId", "officialId")
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "StokvelLoanRepayment" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "loanId" TEXT NOT NULL,
      "stokvelId" TEXT NOT NULL,
      "amount" DECIMAL(12,2) NOT NULL,
      "recordedById" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS "StokvelLoanRepayment_loanId_idx" ON "StokvelLoanRepayment" ("loanId");'
  );
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "StokvelTradeCredit" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "stokvelId" TEXT NOT NULL,
      "retailer" TEXT NOT NULL,
      "amount" DECIMAL(12,2) NOT NULL,
      "discountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
      "months" INTEGER NOT NULL DEFAULT 12,
      "purpose" TEXT,
      "status" TEXT NOT NULL DEFAULT 'ACTIVE',
      "createdById" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS "StokvelTradeCredit_stokvelId_idx" ON "StokvelTradeCredit" ("stokvelId", "createdAt");'
  );
}

let tablesReady = null;
function ensureTables() {
  if (!tablesReady) tablesReady = createTables().catch((err) => { tablesReady = null; throw err; });
  return tablesReady;
}

async function guard(req, res, { officialOnly = false } = {}) {
  await ensureTables();
  const { stokvelId } = req.params;
  const [stokvel, member, official] = await Promise.all([
    prisma.stokvel.findUnique({ where: { id: stokvelId }, select: { organiserId: true, requiredApprovals: true } }),
    prisma.stokvelMember.findFirst({ where: { stokvelId, userId: req.userId } }),
    prisma.stokvelOfficial.findFirst({ where: { stokvelId, userId: req.userId } }),
  ]);
  if (!stokvel) { res.status(404).json({ error: 'Stokvel not found' }); return null; }
  const isOfficial = Boolean(official) || stokvel.organiserId === req.userId;
  if (!member && !isOfficial) { res.status(403).json({ error: 'Not a member of this stokvel' }); return null; }
  if (officialOnly && !isOfficial) { res.status(403).json({ error: 'Only officials can do this' }); return null; }
  return { isOfficial, requiredApprovals: stokvel.requiredApprovals || 2 };
}

const money = (n) => `R${Number(n).toFixed(2)}`;
const fullName = (u) => (u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Member' : 'Member');

async function namesFor(ids) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return {};
  const users = await prisma.user.findMany({ where: { id: { in: unique } }, select: { id: true, firstName: true, lastName: true } });
  return Object.fromEntries(users.map((u) => [u.id, fullName(u)]));
}

// Contribution.memberId is a StokvelMember id, not a User id. Map each
// membership to its user so names can be looked up like everything else.
async function usersForMemberships(membershipIds) {
  const unique = [...new Set(membershipIds.filter(Boolean))];
  if (unique.length === 0) return {};
  const rows = await prisma.stokvelMember.findMany({ where: { id: { in: unique } }, select: { id: true, userId: true } });
  return Object.fromEntries(rows.map((m) => [m.id, m.userId]));
}

// A refusal raised inside a transaction; it rolls everything back and is
// returned to the caller with its own status code.
class RequestRefused extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Decides a loan from its votes. Exported for unit tests.
export function decideLoanStatus({ yes, no, requiredApprovals }) {
  if (yes >= requiredApprovals) return 'APPROVED';
  if (no >= requiredApprovals) return 'REJECTED';
  return 'PENDING';
}

// Splits a repayment into principal first, then interest, in whole cents.
// Exported for unit tests.
export function splitRepayment({ amountCents, principalCents, paidBeforeCents }) {
  const principalLeft = Math.max(0, principalCents - paidBeforeCents);
  const principalPart = Math.min(amountCents, principalLeft);
  return { principalPart, interestPart: amountCents - principalPart };
}

// ---------- Loans ----------

export async function listLoans(req, res) {
  try {
    const role = await guard(req, res);
    if (!role) return;
    const { stokvelId } = req.params;
    const loans = await prisma.$queryRaw`
      SELECT * FROM "StokvelLoan" WHERE "stokvelId" = ${stokvelId} ORDER BY "createdAt" DESC LIMIT 100`;
    const ids = loans.map((l) => l.id);
    const votes = ids.length ? await prisma.$queryRaw`
      SELECT "loanId", "officialId", "approve" FROM "StokvelLoanVote" WHERE "loanId" = ANY(${ids})` : [];
    const repaid = ids.length ? await prisma.$queryRaw`
      SELECT "loanId", SUM("amount") AS total FROM "StokvelLoanRepayment" WHERE "loanId" = ANY(${ids}) GROUP BY "loanId"` : [];
    const repaidMap = Object.fromEntries(repaid.map((r) => [r.loanId, Number(r.total)]));
    const names = await namesFor([...loans.map((l) => l.borrowerId), ...votes.map((v) => v.officialId)]);
    res.json({
      requiredApprovals: role.requiredApprovals,
      isOfficial: role.isOfficial,
      loans: loans.map((l) => {
        const amount = Number(l.amount);
        const totalDue = totalDueFor(l);
        const loanVotes = votes.filter((v) => v.loanId === l.id);
        return {
          id: l.id, borrowerId: l.borrowerId, borrowerName: names[l.borrowerId] || 'Member',
          amount, interestPercent: Number(l.interestPercent), rateBasis: l.rateBasis || null,
          repayMonths: l.repayMonths,
          reason: l.reason, status: l.status, createdAt: l.createdAt, decidedAt: l.decidedAt,
          totalDue, repaid: repaidMap[l.id] || 0,
          monthlyInstalment: totalDue / Math.max(1, l.repayMonths),
          votes: loanVotes.map((v) => ({ officialId: v.officialId, name: names[v.officialId] || 'Official', approve: v.approve })),
          myVote: loanVotes.find((v) => v.officialId === req.userId)?.approve ?? null,
          agreedAt: l.agreedAt,
          agreement: (role.isOfficial || l.borrowerId === req.userId) && l.agreedAt
            ? { phone: l.borrowerPhone, photo: l.borrowerPhoto, idPhoto: l.idPhoto, signature: l.signature }
            : null,
        };
      }),
    });
  } catch (error) {
    console.error('List loans error:', error.message);
    res.status(500).json({ error: 'Could not load loans' });
  }
}

export async function requestLoan(req, res) {
  try {
    if (!(await guard(req, res))) return;
    const { stokvelId } = req.params;
    let amountCents;
    try { amountCents = toCents(String(req.body?.amount ?? '')); } catch { amountCents = 0; }
    if (!(amountCents > 0)) return res.status(400).json({ error: 'Enter a loan amount above zero (at most 2 decimals)' });
    // No default interest: the borrower and group must see and agree the rate.
    const parsed = parseTerms({
      interestPercent: req.body?.interestPercent,
      rateBasis: req.body?.rateBasis,
      months: req.body?.repayMonths,
    });
    if (!parsed.ok) return res.status(400).json({ error: parsed.error });
    const { interestPercent, rateBasis, months: repayMonths } = parsed.terms;

    const isImage = (v) => typeof v === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(v) && v.length < 1_500_000;
    const { borrowerPhoto, idPhoto, signature } = req.body || {};
    const borrowerPhone = String(req.body?.borrowerPhone || '').replace(/[^0-9+ ]/g, '').slice(0, 20) || null;
    if (!isImage(borrowerPhoto)) return res.status(400).json({ error: 'Take a photo of the borrower before sending the request' });
    if (!isImage(signature)) return res.status(400).json({ error: 'The borrower must sign the agreement' });
    if (idPhoto && !isImage(idPhoto)) return res.status(400).json({ error: 'The ID photo could not be read. Please retake it' });
    if (req.body?.agreed !== true) return res.status(400).json({ error: 'The borrower must accept the loan terms' });
    const open = await prisma.$queryRaw`
      SELECT 1 FROM "StokvelLoan" WHERE "stokvelId" = ${stokvelId} AND "borrowerId" = ${req.userId}
      AND "status" IN ('PENDING', 'APPROVED') LIMIT 1`;
    if (open.length) return res.status(409).json({ error: 'You already have an open loan or request in this stokvel' });

    const schedule = buildSchedule({ principalCents: amountCents, ratePercent: interestPercent, rateBasis, months: repayMonths });
    const snapshot = JSON.stringify({
      interestPercent, rateBasis, months: repayMonths, principalCents: amountCents,
      totalInterestCents: schedule.totalInterestCents, totalDueCents: schedule.totalDueCents,
    });
    const amount = amountCents / 100;
    const id = randomUUID();
    const reason = String(req.body?.reason || '').slice(0, 1000) || null;
    await prisma.$executeRaw`
      INSERT INTO "StokvelLoan" ("id", "stokvelId", "borrowerId", "amount", "interestPercent", "rateBasis", "termsSnapshot", "repayMonths", "reason",
        "borrowerPhone", "borrowerPhoto", "idPhoto", "signature", "agreedAt")
      VALUES (${id}, ${stokvelId}, ${req.userId}, ${amount}, ${interestPercent}, ${rateBasis}, ${snapshot}::jsonb, ${repayMonths}, ${reason},
        ${borrowerPhone}, ${borrowerPhoto}, ${idPhoto || null}, ${signature}, CURRENT_TIMESTAMP)`;
    await logAudit(stokvelId, req.userId, 'Requested a loan and signed the agreement', `${money(amount)} at ${interestPercent}% (${rateBasis}) over ${repayMonths} month(s)`);
    res.status(201).json({ id, totalDue: schedule.totalDueCents / 100 });
  } catch (error) {
    console.error('Request loan error:', error.message);
    res.status(500).json({ error: 'Could not request loan' });
  }
}

// The vote, the loan decision and (on approval) the books entry are ONE
// transaction (FIN-01c). The loan row is locked, so two officials voting at
// the same moment are counted one after the other and the loan is paid out
// on the books exactly once.
export async function voteLoan(req, res) {
  try {
    // Do not coerce strings such as "false" to true. A malformed request
    // must never silently become an approval vote.
    if (typeof req.body?.approve !== 'boolean') {
      return res.status(400).json({ error: 'approve must be a boolean value' });
    }
    const role = await guard(req, res, { officialOnly: true });
    if (!role) return;
    const { stokvelId, loanId } = req.params;
    const approve = req.body.approve;
    await ensureLedgerTables();

    const result = await prisma.$transaction(async (tx) => {
      await lockStokvelLedger(tx, stokvelId);
      const rows = await tx.$queryRaw`
        SELECT "borrowerId", "status", "amount", "termsSnapshot" FROM "StokvelLoan"
        WHERE "id" = ${loanId} AND "stokvelId" = ${stokvelId} FOR UPDATE`;
      if (!rows.length) throw new RequestRefused(404, 'Loan not found');
      if (rows[0].status !== 'PENDING') throw new RequestRefused(409, 'Voting on this loan has closed');
      if (rows[0].borrowerId === req.userId) throw new RequestRefused(403, 'You cannot vote on your own loan');

      await tx.$executeRaw`
        INSERT INTO "StokvelLoanVote" ("loanId", "officialId", "approve") VALUES (${loanId}, ${req.userId}, ${approve})
        ON CONFLICT ("loanId", "officialId") DO UPDATE SET "approve" = EXCLUDED."approve", "createdAt" = CURRENT_TIMESTAMP`;
      const tally = await tx.$queryRaw`
        SELECT COUNT(*) FILTER (WHERE "approve") AS yes, COUNT(*) FILTER (WHERE NOT "approve") AS no
        FROM "StokvelLoanVote" WHERE "loanId" = ${loanId}`;
      const yes = Number(tally[0].yes);
      const no = Number(tally[0].no);
      const status = decideLoanStatus({ yes, no, requiredApprovals: role.requiredApprovals });

      if (status !== 'PENDING') {
        await tx.$executeRaw`UPDATE "StokvelLoan" SET "status" = ${status}, "decidedAt" = CURRENT_TIMESTAMP WHERE "id" = ${loanId}`;
      }
      if (status === 'APPROVED') {
        // Money leaves the group pot and becomes an amount owed back by the borrower.
        // FIN-03: the stored group balance drops by the same amount, and only
        // if it still covers the loan, so it can never go below zero.
        const principalCents = toCents(String(rows[0].amount));
        const posted = await postEntryWithBalanceTx(tx, {
          stokvelId, kind: 'LOAN_DISBURSEMENT', memo: 'Loan approved and paid out',
          lines: [{ account: 'LOANS_RECEIVABLE', amountCents: principalCents }, { account: 'BANK', amountCents: -principalCents }],
          idempotencyKey: `loan:${loanId}`, createdById: rows[0].borrowerId, approvedById: req.userId,
        }, { requireFunds: true });
        if (posted.fundsShort) {
          throw new RequestRefused(409, 'The group balance is too low to pay out this loan. Your vote was not saved.');
        }
      }
      return { status, yes, no, amount: rows[0].amount };
    });

    await logAuditQuietly(stokvelId, req.userId, approve ? 'Voted to approve a loan' : 'Voted to reject a loan', money(result.amount));
    res.json({ status: result.status, yes: result.yes, no: result.no, ledgerWarning: null });
  } catch (error) {
    if (error instanceof RequestRefused) return res.status(error.status).json({ error: error.message });
    console.error('Vote loan error:', error.message);
    res.status(500).json({ error: 'Could not record your vote. Nothing was changed, so it is safe to try again.' });
  }
}

// The repayment record, the REPAID status and the books entry are ONE
// transaction (FIN-01c). The loan row is locked, so two repayments recorded
// at the same moment cannot together go over what is owed.
export async function repayLoan(req, res) {
  try {
    if (!(await guard(req, res, { officialOnly: true }))) return;
    const { stokvelId, loanId } = req.params;
    let amountCents;
    try { amountCents = toCents(String(req.body?.amount ?? '')); } catch { amountCents = 0; }
    if (!(amountCents > 0)) return res.status(400).json({ error: 'Enter a repayment amount above zero (at most 2 decimals)' });
    await ensureLedgerTables();

    const result = await prisma.$transaction(async (tx) => {
      await lockStokvelLedger(tx, stokvelId);
      const rows = await tx.$queryRaw`
        SELECT "status", "amount", "interestPercent", "termsSnapshot", "borrowerId" FROM "StokvelLoan"
        WHERE "id" = ${loanId} AND "stokvelId" = ${stokvelId} FOR UPDATE`;
      if (!rows.length) throw new RequestRefused(404, 'Loan not found');
      const loan = rows[0];
      if (loan.status !== 'APPROVED') throw new RequestRefused(409, 'Only approved, unpaid loans can take repayments');
      // Nobody records repayments on their own loan.
      if (loan.borrowerId === req.userId) {
        throw new RequestRefused(403, 'You cannot record repayments on your own loan. Another official must do it.');
      }

      const totalDueCents = Math.round(totalDueFor(loan) * 100);
      const before = await tx.$queryRaw`
        SELECT COALESCE(SUM("amount"), 0) AS total FROM "StokvelLoanRepayment" WHERE "loanId" = ${loanId}`;
      const paidBeforeCents = toCents(Number(before[0].total).toFixed(2));
      const owedCents = totalDueCents - paidBeforeCents;
      if (amountCents > owedCents) {
        throw new RequestRefused(400, `That is more than is still owed (${money(owedCents / 100)})`);
      }

      const repaymentId = randomUUID();
      await tx.$executeRaw`
        INSERT INTO "StokvelLoanRepayment" ("id", "loanId", "stokvelId", "amount", "recordedById")
        VALUES (${repaymentId}, ${loanId}, ${stokvelId}, ${amountCents / 100}, ${req.userId})`;
      const settled = paidBeforeCents + amountCents >= totalDueCents;
      if (settled) await tx.$executeRaw`UPDATE "StokvelLoan" SET "status" = 'REPAID' WHERE "id" = ${loanId}`;

      // Loans made before agreed terms were stored were never put on the books
      // when issued, so their repayments are not added either (no half records).
      if (loan.termsSnapshot) {
        const { principalPart, interestPart } = splitRepayment({
          amountCents, principalCents: toCents(String(loan.amount)), paidBeforeCents,
        });
        const lines = [{ account: 'BANK', amountCents }];
        if (principalPart > 0) lines.push({ account: 'LOANS_RECEIVABLE', amountCents: -principalPart });
        if (interestPart > 0) lines.push({ account: 'INTEREST_INCOME', amountCents: -interestPart });
        // FIN-03: the repaid money goes back into the stored group balance too.
        await postEntryWithBalanceTx(tx, {
          stokvelId, kind: 'LOAN_REPAYMENT', memo: 'Loan repayment',
          lines, idempotencyKey: `repayment:${repaymentId}`, createdById: req.userId,
        });
      }
      return { settled, borrowerId: loan.borrowerId };
    });

    const names = await namesFor([result.borrowerId]).catch(() => ({}));
    await logAuditQuietly(stokvelId, req.userId, 'Recorded a loan repayment', `${money(amountCents / 100)} from ${names[result.borrowerId] || 'Member'}`);
    res.json({ message: result.settled ? 'Loan fully repaid' : 'Repayment recorded', settled: result.settled, ledgerWarning: null });
  } catch (error) {
    if (error instanceof RequestRefused) return res.status(error.status).json({ error: error.message });
    console.error('Repay loan error:', error.message);
    res.status(500).json({ error: 'Could not record the repayment. Nothing was saved, so it is safe to try again.' });
  }
}

// ---------- Trade credit ----------
//
// FIN-04: amounts are exact cents (more than 2 decimals refused, never
// rounded) and are read back from the database as exact text.
// FIN-03 decision: trade credit is a record of a deal with a retailer, not
// money leaving the group's bank, so it is deliberately NOT posted to the
// books and does not change the group balance.

const MAX_CREDIT_CENTS = 1_000_000_000; // R10 million, well inside DECIMAL(12,2)
const PERCENT_PATTERN = /^\d{1,2}(\.\d{1,2})?$/;

// Validates a new trade credit deal. Returns { ok: true, value } or
// { ok: false, error }. Exported for unit tests.
export function parseTradeCredit(body) {
  const retailer = String(body?.retailer || '').trim().slice(0, 200);
  if (!retailer) return { ok: false, error: 'Retailer name is required' };

  let amountCents;
  try { amountCents = toCents(String(body?.amount ?? '')); } catch { amountCents = 0; }
  if (!(amountCents > 0)) return { ok: false, error: 'Enter an amount above zero (at most 2 decimals)' };
  if (amountCents > MAX_CREDIT_CENTS) return { ok: false, error: 'Amount is too large' };

  const rawDiscount = body?.discountPercent === undefined || body?.discountPercent === null || body?.discountPercent === ''
    ? '0' : String(body.discountPercent).trim();
  if (!PERCENT_PATTERN.test(rawDiscount) || Number(rawDiscount) > 90) {
    return { ok: false, error: 'Discount must be between 0 and 90% (at most 2 decimals)' };
  }

  const rawMonths = body?.months === undefined || body?.months === null || body?.months === '' ? '12' : String(body.months).trim();
  const months = /^\d+$/.test(rawMonths) ? Number(rawMonths) : NaN;
  if (!(months >= 1 && months <= 60)) return { ok: false, error: 'Months must be a whole number from 1 to 60' };

  const purpose = String(body?.purpose || '').trim().slice(0, 1000) || null;
  return { ok: true, value: { retailer, amountCents, discountPercent: rawDiscount, months, purpose } };
}

// Expected saving on a deal, in whole cents (rounded half up). Exported for unit tests.
export function tradeCreditSavingCents(amountCents, discountPercent) {
  const basisPoints = Math.round(Number(discountPercent) * 100); // 12.5% -> 1250
  return Math.round((amountCents * basisPoints) / 10_000);
}

// Deals can only move forward: an ACTIVE deal can be marked USED or CANCELLED.
// A used or cancelled deal cannot be revived. Exported for unit tests.
export function canChangeCreditStatus(from, to) {
  return from === 'ACTIVE' && (to === 'USED' || to === 'CANCELLED');
}

export async function listTradeCredit(req, res) {
  try {
    if (!(await guard(req, res))) return;
    const rows = await prisma.$queryRaw`
      SELECT "id", "retailer", "amount"::text AS amount, "discountPercent"::text AS "discountPercent",
        "months", "purpose", "status", "createdAt"
      FROM "StokvelTradeCredit" WHERE "stokvelId" = ${req.params.stokvelId} ORDER BY "createdAt" DESC LIMIT 100`;
    // Response shape unchanged: amount in rand and discount as numbers.
    res.json(rows.map((r) => ({
      id: r.id, retailer: r.retailer, amount: toCents(r.amount) / 100, discountPercent: Number(r.discountPercent),
      months: r.months, purpose: r.purpose, status: r.status, createdAt: r.createdAt,
    })));
  } catch (error) {
    console.error('List trade credit error:', error.message);
    res.status(500).json({ error: 'Could not load trade credit' });
  }
}

export async function createTradeCredit(req, res) {
  try {
    if (!(await guard(req, res, { officialOnly: true }))) return;
    const { stokvelId } = req.params;
    const parsed = parseTradeCredit(req.body);
    if (!parsed.ok) return res.status(400).json({ error: parsed.error });
    const { retailer, amountCents, discountPercent, months, purpose } = parsed.value;
    const amount = (amountCents / 100).toFixed(2);
    const id = randomUUID();
    await prisma.$executeRaw`
      INSERT INTO "StokvelTradeCredit" ("id", "stokvelId", "retailer", "amount", "discountPercent", "months", "purpose", "createdById")
      VALUES (${id}, ${stokvelId}, ${retailer}, ${amount}::numeric, ${discountPercent}::numeric, ${months}, ${purpose}, ${req.userId})`;
    // The deal is saved; a failed audit line is logged, not returned as an
    // error (that would invite a duplicate deal).
    await logAuditQuietly(stokvelId, req.userId, 'Committed trade credit', `R${amount} with ${retailer} at ${discountPercent}% off`);
    res.status(201).json({ id });
  } catch (error) {
    console.error('Create trade credit error:', error.message);
    res.status(500).json({ error: 'Could not save trade credit' });
  }
}

const CREDIT_STATUSES = ['ACTIVE', 'USED', 'CANCELLED'];

export async function updateTradeCredit(req, res) {
  try {
    if (!(await guard(req, res, { officialOnly: true }))) return;
    const { stokvelId, creditId } = req.params;
    const status = req.body?.status;
    if (!CREDIT_STATUSES.includes(status)) return res.status(400).json({ error: 'Unknown status' });
    if (!canChangeCreditStatus('ACTIVE', status)) return res.status(400).json({ error: 'A deal can only be marked used or cancelled' });
    // Only an ACTIVE deal changes, checked in the same statement as the update,
    // so two officials acting at once cannot both change it.
    const rows = await prisma.$queryRaw`
      UPDATE "StokvelTradeCredit" SET "status" = ${status}
      WHERE "id" = ${creditId} AND "stokvelId" = ${stokvelId} AND "status" = 'ACTIVE'
      RETURNING "retailer"`;
    if (!rows.length) {
      const exists = await prisma.$queryRaw`
        SELECT "status" FROM "StokvelTradeCredit" WHERE "id" = ${creditId} AND "stokvelId" = ${stokvelId}`;
      if (!exists.length) return res.status(404).json({ error: 'Trade credit not found' });
      return res.status(409).json({ error: `This deal is already ${String(exists[0].status).toLowerCase()} and cannot be changed` });
    }
    await logAuditQuietly(stokvelId, req.userId, 'Updated trade credit', `${rows[0].retailer}: ${status.toLowerCase()}`);
    res.json({ message: 'Updated' });
  } catch (error) {
    console.error('Update trade credit error:', error.message);
    res.status(500).json({ error: 'Could not update trade credit' });
  }
}

// ---------- Statement ----------

// Every money movement in a date range, oldest first, with a running total.
// Parse statement dates strictly as calendar days in UTC. JavaScript's Date
// parser normalises impossible dates (for example, February 31), so round-trip
// the YYYY-MM-DD value before accepting it.
export function parseStatementDateRange(query = {}, now = new Date()) {
  const parseDay = (value, endOfDay = false) => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
    return date;
  };

  const from = query.from === undefined || query.from === ''
    ? new Date(Date.UTC(now.getUTCFullYear(), 0, 1))
    : parseDay(query.from);
  const to = query.to === undefined || query.to === ''
    ? new Date(now)
    : parseDay(query.to, true);

  if (!from || !to || from > to) return { ok: false };
  return { ok: true, from, to };
}

export async function getStatement(req, res) {
  try {
    if (!(await guard(req, res))) return;
    const { stokvelId } = req.params;
    const range = parseStatementDateRange(req.query);
    if (!range.ok) return res.status(400).json({ error: 'Invalid date range' });
    const { from, to } = range;

    const [contributions, payouts, fines, loans, repayments] = await Promise.all([
      prisma.contribution.findMany({ where: { stokvelId, status: 'CONFIRMED', createdAt: { gte: from, lte: to } }, take: 2000 }),
      prisma.payout.findMany({ where: { stokvelId, status: 'CLEARED', createdAt: { gte: from, lte: to } }, take: 2000 }),
      prisma.$queryRaw`SELECT "memberId", "amount", "fineType", "paidAt" FROM "StokvelFine"
        WHERE "stokvelId" = ${stokvelId} AND "paid" = true AND "paidAt" BETWEEN ${from} AND ${to}`.catch(() => []),
      prisma.$queryRaw`SELECT "borrowerId", "amount", "decidedAt" FROM "StokvelLoan"
        WHERE "stokvelId" = ${stokvelId} AND "status" IN ('APPROVED', 'REPAID') AND "decidedAt" BETWEEN ${from} AND ${to}`,
      prisma.$queryRaw`SELECT r."amount", r."createdAt", l."borrowerId" FROM "StokvelLoanRepayment" r
        JOIN "StokvelLoan" l ON l."id" = r."loanId"
        WHERE r."stokvelId" = ${stokvelId} AND r."createdAt" BETWEEN ${from} AND ${to}`,
    ]);

    // Contributions point at a membership; payouts, fines and loans already
    // point at the user. Resolve contributions to users first.
    const userOfMembership = await usersForMemberships(contributions.map((c) => c.memberId));
    const contributorOf = (c) => userOfMembership[c.memberId];

    const names = await namesFor([
      ...contributions.map(contributorOf), ...payouts.map((p) => p.recipientId),
      ...fines.map((f) => f.memberId), ...loans.map((l) => l.borrowerId), ...repayments.map((r) => r.borrowerId),
    ]);

    const entries = [
      ...contributions.map((c) => ({ date: c.createdAt, type: 'Contribution', who: names[contributorOf(c)], amount: Number(c.amount) })),
      ...payouts.map((p) => ({ date: p.clearedAt || p.createdAt, type: 'Payout', who: names[p.recipientId], amount: -Number(p.amount) })),
      ...fines.map((f) => ({ date: f.paidAt, type: 'Fine paid', who: names[f.memberId], amount: Number(f.amount) })),
      ...loans.map((l) => ({ date: l.decidedAt, type: 'Loan issued', who: names[l.borrowerId], amount: -Number(l.amount) })),
      ...repayments.map((r) => ({ date: r.createdAt, type: 'Loan repayment', who: names[r.borrowerId], amount: Number(r.amount) })),
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    let running = 0;
    // Only someone whose account no longer exists falls back to this label.
    const withRunning = entries.map((e) => { running += e.amount; return { ...e, who: e.who || 'Former member', running }; });
    const sumOf = (type) => entries.filter((e) => e.type === type).reduce((s, e) => s + e.amount, 0);

    res.json({
      from: from.toISOString(), to: to.toISOString(), entries: withRunning,
      totals: {
        contributions: sumOf('Contribution'), payouts: sumOf('Payout'), fines: sumOf('Fine paid'),
        loansIssued: sumOf('Loan issued'), repayments: sumOf('Loan repayment'), net: running,
      },
    });
  } catch (error) {
    console.error('Statement error:', error.message);
    res.status(500).json({ error: 'Could not build statement' });
  }
}
