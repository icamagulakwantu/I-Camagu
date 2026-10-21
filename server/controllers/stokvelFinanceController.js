import { randomUUID } from 'crypto';
import prisma from '../config/db.js';
import { logAudit } from './stokvelRecordsController.js';
import { postEntry } from '../services/ledgerService.js';
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

// The books entry is written after the loan record. If it fails the loan flow
// still succeeded, so we log loudly and warn the caller. Re-running is safe.
async function postToLedger(entry) {
  try {
    await postEntry(entry);
    return null;
  } catch (error) {
    console.error('LEDGER POST FAILED', entry.kind, entry.idempotencyKey, error.message);
    return 'The loan was updated but the books entry could not be saved. Tell your treasurer so it can be corrected.';
  }
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

export async function voteLoan(req, res) {
  try {
    const role = await guard(req, res, { officialOnly: true });
    if (!role) return;
    const { stokvelId, loanId } = req.params;
    const approve = Boolean(req.body?.approve);
    const rows = await prisma.$queryRaw`
      SELECT "borrowerId", "status", "amount", "termsSnapshot" FROM "StokvelLoan" WHERE "id" = ${loanId} AND "stokvelId" = ${stokvelId}`;
    if (!rows.length) return res.status(404).json({ error: 'Loan not found' });
    if (rows[0].status !== 'PENDING') return res.status(409).json({ error: 'Voting on this loan has closed' });
    if (rows[0].borrowerId === req.userId) return res.status(403).json({ error: 'You cannot vote on your own loan' });
    await prisma.$executeRaw`
      INSERT INTO "StokvelLoanVote" ("loanId", "officialId", "approve") VALUES (${loanId}, ${req.userId}, ${approve})
      ON CONFLICT ("loanId", "officialId") DO UPDATE SET "approve" = EXCLUDED."approve", "createdAt" = CURRENT_TIMESTAMP`;
    const tally = await prisma.$queryRaw`
      SELECT COUNT(*) FILTER (WHERE "approve") AS yes, COUNT(*) FILTER (WHERE NOT "approve") AS no
      FROM "StokvelLoanVote" WHERE "loanId" = ${loanId}`;
    const yes = Number(tally[0].yes);
    const no = Number(tally[0].no);
    let status = 'PENDING';
    if (yes >= role.requiredApprovals) status = 'APPROVED';
    else if (no >= role.requiredApprovals) status = 'REJECTED';
    let ledgerWarning = null;
    if (status !== 'PENDING') {
      await prisma.$executeRaw`UPDATE "StokvelLoan" SET "status" = ${status}, "decidedAt" = CURRENT_TIMESTAMP WHERE "id" = ${loanId}`;
    }
    if (status === 'APPROVED') {
      // Money leaves the group pot and becomes an amount owed back by the borrower.
      const principalCents = toCents(String(rows[0].amount));
      ledgerWarning = await postToLedger({
        stokvelId, kind: 'LOAN_DISBURSEMENT', memo: 'Loan approved and paid out',
        lines: [{ account: 'LOANS_RECEIVABLE', amountCents: principalCents }, { account: 'BANK', amountCents: -principalCents }],
        idempotencyKey: `loan:${loanId}`, createdById: rows[0].borrowerId, approvedById: req.userId,
      });
    }
    await logAudit(stokvelId, req.userId, approve ? 'Voted to approve a loan' : 'Voted to reject a loan', money(rows[0].amount));
    res.json({ status, yes, no, ledgerWarning });
  } catch (error) {
    console.error('Vote loan error:', error.message);
    res.status(500).json({ error: 'Could not record vote' });
  }
}

export async function repayLoan(req, res) {
  try {
    if (!(await guard(req, res, { officialOnly: true }))) return;
    const { stokvelId, loanId } = req.params;
    let amountCents;
    try { amountCents = toCents(String(req.body?.amount ?? '')); } catch { amountCents = 0; }
    if (!(amountCents > 0)) return res.status(400).json({ error: 'Enter a repayment amount above zero (at most 2 decimals)' });
    const rows = await prisma.$queryRaw`
      SELECT "status", "amount", "interestPercent", "termsSnapshot", "borrowerId" FROM "StokvelLoan" WHERE "id" = ${loanId} AND "stokvelId" = ${stokvelId}`;
    if (!rows.length) return res.status(404).json({ error: 'Loan not found' });
    if (rows[0].status !== 'APPROVED') return res.status(409).json({ error: 'Only approved, unpaid loans can take repayments' });
    // Nobody records repayments on their own loan.
    if (rows[0].borrowerId === req.userId) return res.status(403).json({ error: 'You cannot record repayments on your own loan. Another official must do it.' });

    const totalDueCents = Math.round(totalDueFor(rows[0]) * 100);
    const before = await prisma.$queryRaw`SELECT COALESCE(SUM("amount"), 0) AS total FROM "StokvelLoanRepayment" WHERE "loanId" = ${loanId}`;
    const paidBeforeCents = Math.round(Number(before[0].total) * 100);
    if (amountCents > totalDueCents - paidBeforeCents) {
      return res.status(400).json({ error: `That is more than is still owed (${money((totalDueCents - paidBeforeCents) / 100)})` });
    }

    const repaymentId = randomUUID();
    await prisma.$executeRaw`
      INSERT INTO "StokvelLoanRepayment" ("id", "loanId", "stokvelId", "amount", "recordedById")
      VALUES (${repaymentId}, ${loanId}, ${stokvelId}, ${amountCents / 100}, ${req.userId})`;
    const settled = paidBeforeCents + amountCents >= totalDueCents;
    if (settled) await prisma.$executeRaw`UPDATE "StokvelLoan" SET "status" = 'REPAID' WHERE "id" = ${loanId}`;

    // Loans made before agreed terms were stored were never put on the books
    // when issued, so their repayments are not added either (no half records).
    let ledgerWarning = null;
    if (rows[0].termsSnapshot) {
      const principalCents = toCents(String(rows[0].amount));
      const principalLeft = Math.max(0, principalCents - paidBeforeCents);
      const principalPart = Math.min(amountCents, principalLeft);
      const interestPart = amountCents - principalPart;
      const lines = [{ account: 'BANK', amountCents }];
      if (principalPart > 0) lines.push({ account: 'LOANS_RECEIVABLE', amountCents: -principalPart });
      if (interestPart > 0) lines.push({ account: 'INTEREST_INCOME', amountCents: -interestPart });
      ledgerWarning = await postToLedger({
        stokvelId, kind: 'LOAN_REPAYMENT', memo: 'Loan repayment',
        lines, idempotencyKey: `repayment:${repaymentId}`, createdById: req.userId,
      });
    }
    const names = await namesFor([rows[0].borrowerId]);
    await logAudit(stokvelId, req.userId, 'Recorded a loan repayment', `${money(amountCents / 100)} from ${names[rows[0].borrowerId] || 'Member'}`);
    res.json({ message: settled ? 'Loan fully repaid' : 'Repayment recorded', settled, ledgerWarning });
  } catch (error) {
    console.error('Repay loan error:', error.message);
    res.status(500).json({ error: 'Could not record repayment' });
  }
}

// ---------- Trade credit ----------

export async function listTradeCredit(req, res) {
  try {
    if (!(await guard(req, res))) return;
    const rows = await prisma.$queryRaw`
      SELECT * FROM "StokvelTradeCredit" WHERE "stokvelId" = ${req.params.stokvelId} ORDER BY "createdAt" DESC LIMIT 100`;
    res.json(rows.map((r) => ({
      id: r.id, retailer: r.retailer, amount: Number(r.amount), discountPercent: Number(r.discountPercent),
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
    const retailer = String(req.body?.retailer || '').trim().slice(0, 200);
    const amount = Number(req.body?.amount);
    const discountPercent = Number(req.body?.discountPercent || 0);
    const months = parseInt(req.body?.months, 10) || 12;
    if (!retailer) return res.status(400).json({ error: 'Retailer name is required' });
    if (!(amount > 0)) return res.status(400).json({ error: 'Enter an amount above zero' });
    if (!(discountPercent >= 0 && discountPercent <= 90)) return res.status(400).json({ error: 'Discount must be between 0 and 90%' });
    const purpose = String(req.body?.purpose || '').slice(0, 1000) || null;
    const id = randomUUID();
    await prisma.$executeRaw`
      INSERT INTO "StokvelTradeCredit" ("id", "stokvelId", "retailer", "amount", "discountPercent", "months", "purpose", "createdById")
      VALUES (${id}, ${stokvelId}, ${retailer}, ${amount}, ${discountPercent}, ${months}, ${purpose}, ${req.userId})`;
    await logAudit(stokvelId, req.userId, 'Committed trade credit', `${money(amount)} with ${retailer} at ${discountPercent}% off`);
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
    const rows = await prisma.$queryRaw`
      UPDATE "StokvelTradeCredit" SET "status" = ${status} WHERE "id" = ${creditId} AND "stokvelId" = ${stokvelId}
      RETURNING "retailer"`;
    if (!rows.length) return res.status(404).json({ error: 'Trade credit not found' });
    await logAudit(stokvelId, req.userId, 'Updated trade credit', `${rows[0].retailer}: ${status.toLowerCase()}`);
    res.json({ message: 'Updated' });
  } catch (error) {
    console.error('Update trade credit error:', error.message);
    res.status(500).json({ error: 'Could not update trade credit' });
  }
}

// ---------- Statement ----------

// Every money movement in a date range, oldest first, with a running total.
export async function getStatement(req, res) {
  try {
    if (!(await guard(req, res))) return;
    const { stokvelId } = req.params;
    const from = req.query.from ? new Date(`${req.query.from}T00:00:00.000Z`) : new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));
    const to = req.query.to ? new Date(`${req.query.to}T23:59:59.999Z`) : new Date();
    if (isNaN(from) || isNaN(to)) return res.status(400).json({ error: 'Invalid date range' });

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

    const names = await namesFor([
      ...contributions.map((c) => c.memberId), ...payouts.map((p) => p.recipientId),
      ...fines.map((f) => f.memberId), ...loans.map((l) => l.borrowerId), ...repayments.map((r) => r.borrowerId),
    ]);

    const entries = [
      ...contributions.map((c) => ({ date: c.createdAt, type: 'Contribution', who: names[c.memberId], amount: Number(c.amount) })),
      ...payouts.map((p) => ({ date: p.clearedAt || p.createdAt, type: 'Payout', who: names[p.recipientId], amount: -Number(p.amount) })),
      ...fines.map((f) => ({ date: f.paidAt, type: 'Fine paid', who: names[f.memberId], amount: Number(f.amount) })),
      ...loans.map((l) => ({ date: l.decidedAt, type: 'Loan issued', who: names[l.borrowerId], amount: -Number(l.amount) })),
      ...repayments.map((r) => ({ date: r.createdAt, type: 'Loan repayment', who: names[r.borrowerId], amount: Number(r.amount) })),
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    let running = 0;
    const withRunning = entries.map((e) => { running += e.amount; return { ...e, who: e.who || 'Member', running }; });
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
