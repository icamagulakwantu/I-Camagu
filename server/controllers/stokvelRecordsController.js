import { randomUUID } from 'crypto';
import prisma from '../config/db.js';
import { ensureLedgerTables, lockStokvelLedger, postEntryTx } from '../services/ledgerService.js';
import { toCents } from '../utils/money.js';

// Meeting minutes, fines, constitution and the audit trail for a stokvel.
// This project has no migration history, so these tables are created here
// with IF NOT EXISTS guards and queried with raw SQL, not Prisma models.

async function createTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "StokvelMinutes" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "stokvelId" TEXT NOT NULL,
      "meetingDate" TEXT NOT NULL,
      "data" JSONB NOT NULL,
      "createdById" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS "StokvelMinutes_stokvelId_idx" ON "StokvelMinutes" ("stokvelId", "meetingDate");'
  );
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "StokvelFine" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "stokvelId" TEXT NOT NULL,
      "memberId" TEXT NOT NULL,
      "fineType" TEXT NOT NULL,
      "amount" DECIMAL(10,2) NOT NULL,
      "note" TEXT,
      "fineDate" TEXT,
      "paid" BOOLEAN NOT NULL DEFAULT false,
      "paidAt" TIMESTAMP(3),
      "issuedById" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS "StokvelFine_stokvelId_idx" ON "StokvelFine" ("stokvelId", "createdAt");'
  );
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "StokvelConstitution" (
      "stokvelId" TEXT NOT NULL PRIMARY KEY,
      "data" JSONB NOT NULL,
      "updatedById" TEXT NOT NULL,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "StokvelAuditLog" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "stokvelId" TEXT NOT NULL,
      "actorId" TEXT NOT NULL,
      "actorName" TEXT NOT NULL,
      "action" TEXT NOT NULL,
      "details" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS "StokvelAuditLog_stokvelId_idx" ON "StokvelAuditLog" ("stokvelId", "createdAt");'
  );
}

// Tables are created lazily on first use (once per process), so this
// feature needs no change to server boot.
let tablesReady = null;
function ensureTables() {
  if (!tablesReady) tablesReady = createTables().catch((err) => { tablesReady = null; throw err; });
  return tablesReady;
}

async function getRole(stokvelId, userId) {
  const [stokvel, member, official] = await Promise.all([
    prisma.stokvel.findUnique({ where: { id: stokvelId }, select: { organiserId: true } }),
    prisma.stokvelMember.findFirst({ where: { stokvelId, userId } }),
    prisma.stokvelOfficial.findFirst({ where: { stokvelId, userId } }),
  ]);
  if (!stokvel) return { exists: false };
  const isOfficial = Boolean(official) || stokvel.organiserId === userId;
  return { exists: true, isMember: Boolean(member) || isOfficial, isOfficial };
}

// Shared guard: returns the role, or sends the error response and returns null.
async function guard(req, res, { officialOnly = false } = {}) {
  await ensureTables();
  const role = await getRole(req.params.stokvelId, req.userId);
  if (!role.exists) { res.status(404).json({ error: 'Stokvel not found' }); return null; }
  if (!role.isMember) { res.status(403).json({ error: 'Not a member of this stokvel' }); return null; }
  if (officialOnly && !role.isOfficial) { res.status(403).json({ error: 'Only officials can do this' }); return null; }
  return role;
}

// db can be a transaction client, so a name can be read inside a transaction.
async function actorName(userId, db = prisma) {
  const u = await db.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true } });
  return u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Official' : 'Official';
}

// Append-only: there is deliberately no update or delete endpoint for this table.
export async function logAudit(stokvelId, userId, action, details = null) {
  const name = await actorName(userId);
  await prisma.$executeRaw`
    INSERT INTO "StokvelAuditLog" ("id", "stokvelId", "actorId", "actorName", "action", "details")
    VALUES (${randomUUID()}, ${stokvelId}, ${userId}, ${name}, ${action}, ${details})`;
}

// For audit lines written AFTER money has already been saved: a failure here
// is logged, never allowed to turn a saved payment into an error response.
export async function logAuditQuietly(stokvelId, userId, action, details = null) {
  try {
    await logAudit(stokvelId, userId, action, details);
  } catch (error) {
    console.error('Audit log write failed:', stokvelId, action, error.message);
  }
}

const money = (n) => `R${Number(n).toFixed(2)}`;

// A refusal raised inside a transaction; it rolls everything back and is
// returned to the caller with its own status code.
class RequestRefused extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// ---------- Minutes ----------

export async function listMinutes(req, res) {
  try {
    if (!(await guard(req, res))) return;
    const rows = await prisma.$queryRaw`
      SELECT "id", "data", "createdAt" FROM "StokvelMinutes"
      WHERE "stokvelId" = ${req.params.stokvelId} ORDER BY "meetingDate" DESC, "createdAt" DESC LIMIT 100`;
    res.json(rows.map((r) => ({ id: r.id, createdAt: r.createdAt, ...r.data })));
  } catch (error) {
    console.error('List minutes error:', error.message);
    res.status(500).json({ error: 'Could not load minutes' });
  }
}

export async function createMinutes(req, res) {
  try {
    if (!(await guard(req, res, { officialOnly: true }))) return;
    const b = req.body || {};
    if (!b.date) return res.status(400).json({ error: 'Meeting date is required' });
    const strList = (v) => (Array.isArray(v) ? v.map(String).filter(Boolean).slice(0, 200) : []);
    const data = {
      date: String(b.date),
      location: String(b.location || ''),
      chairperson: String(b.chairperson || ''),
      secretary: String(b.secretary || ''),
      attendees: strList(b.attendees),
      apologies: strList(b.apologies),
      agendaItems: Array.isArray(b.agendaItems) ? b.agendaItems.slice(0, 50) : [],
      actionItems: Array.isArray(b.actionItems) ? b.actionItems.slice(0, 50) : [],
      nextMeetingDate: b.nextMeetingDate || null,
      nextMeetingLocation: String(b.nextMeetingLocation || ''),
    };
    const id = randomUUID();
    await prisma.$executeRaw`
      INSERT INTO "StokvelMinutes" ("id", "stokvelId", "meetingDate", "data", "createdById")
      VALUES (${id}, ${req.params.stokvelId}, ${data.date}, ${JSON.stringify(data)}::jsonb, ${req.userId})`;
    await logAudit(req.params.stokvelId, req.userId, 'Recorded meeting minutes', `Meeting on ${data.date}`);
    res.status(201).json({ id, ...data });
  } catch (error) {
    console.error('Create minutes error:', error.message);
    res.status(500).json({ error: 'Could not save minutes' });
  }
}

// ---------- Fines ----------

const FINE_TYPES = ['LATE_CONTRIBUTION', 'ABSENCE', 'LATE_ATTENDANCE', 'MISCONDUCT', 'OTHER'];

export async function listFines(req, res) {
  try {
    if (!(await guard(req, res))) return;
    const rows = await prisma.$queryRaw`
      SELECT f.*, u."firstName", u."lastName" FROM "StokvelFine" f
      LEFT JOIN "User" u ON u."id" = f."memberId"
      WHERE f."stokvelId" = ${req.params.stokvelId} ORDER BY f."createdAt" DESC LIMIT 200`;
    res.json(rows.map((r) => ({
      id: r.id, memberId: r.memberId, fineType: r.fineType, amount: Number(r.amount),
      note: r.note, date: r.fineDate, paid: r.paid, paidAt: r.paidAt, createdAt: r.createdAt,
      memberName: `${r.firstName || ''} ${r.lastName || ''}`.trim() || 'Member',
    })));
  } catch (error) {
    console.error('List fines error:', error.message);
    res.status(500).json({ error: 'Could not load fines' });
  }
}

export async function issueFine(req, res) {
  try {
    if (!(await guard(req, res, { officialOnly: true }))) return;
    const { stokvelId } = req.params;
    const { memberId, fineType, note, date } = req.body || {};
    // Exact cents (FIN-04): refuse more than 2 decimals instead of rounding.
    let amountCents;
    try { amountCents = toCents(String(req.body?.amount ?? '')); } catch { amountCents = 0; }
    if (!memberId || !(amountCents > 0)) {
      return res.status(400).json({ error: 'Member and a positive amount (at most 2 decimals) are required' });
    }
    if (!FINE_TYPES.includes(fineType)) return res.status(400).json({ error: 'Unknown fine type' });
    // memberId is the member's user id; make sure they really belong to this stokvel.
    const member = await prisma.stokvelMember.findFirst({ where: { stokvelId, userId: memberId } });
    if (!member) return res.status(400).json({ error: 'That person is not a member of this stokvel' });
    const amount = amountCents / 100;
    const id = randomUUID();
    await prisma.$executeRaw`
      INSERT INTO "StokvelFine" ("id", "stokvelId", "memberId", "fineType", "amount", "note", "fineDate", "issuedById")
      VALUES (${id}, ${stokvelId}, ${memberId}, ${fineType}, ${amount}, ${note || null}, ${date || null}, ${req.userId})`;
    const name = await actorName(memberId);
    await logAudit(stokvelId, req.userId, 'Issued a fine', `${money(amount)} to ${name} (${fineType.replace(/_/g, ' ').toLowerCase()})`);
    res.status(201).json({ id });
  } catch (error) {
    console.error('Issue fine error:', error.message);
    res.status(500).json({ error: 'Could not issue fine' });
  }
}

// Marking a fine paid and putting it on the books is ONE transaction (FIN-01c):
// either both are saved or neither is, so a paid fine can never be missing
// from the books.
export async function payFine(req, res) {
  try {
    if (!(await guard(req, res, { officialOnly: true }))) return;
    const { stokvelId, fineId } = req.params;
    await ensureLedgerTables();

    const paid = await prisma.$transaction(async (tx) => {
      // Ledger lock first, the same lock order as every other money flow.
      await lockStokvelLedger(tx, stokvelId);
      const rows = await tx.$queryRaw`
        SELECT "memberId", "amount" FROM "StokvelFine"
        WHERE "id" = ${fineId} AND "stokvelId" = ${stokvelId} AND "paid" = false
        FOR UPDATE`;
      if (rows.length === 0) throw new RequestRefused(404, 'Fine not found or already paid');
      // Nobody marks their own fine as paid.
      if (rows[0].memberId === req.userId) {
        throw new RequestRefused(403, 'You cannot mark your own fine as paid. Another official must do it.');
      }

      await tx.$executeRaw`
        UPDATE "StokvelFine" SET "paid" = true, "paidAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${fineId} AND "stokvelId" = ${stokvelId}`;

      const cents = toCents(String(rows[0].amount));
      const name = await actorName(rows[0].memberId, tx);
      await postEntryTx(tx, {
        stokvelId, kind: 'FINE_PAID', memo: `Fine paid by ${name}`,
        lines: [{ account: 'BANK', amountCents: cents }, { account: 'FINES_INCOME', amountCents: -cents }],
        idempotencyKey: `fine:${fineId}`, createdById: rows[0].memberId, approvedById: req.userId,
      });
      return { amount: rows[0].amount, name };
    });

    await logAuditQuietly(stokvelId, req.userId, 'Marked a fine as paid', `${money(paid.amount)} from ${paid.name}`);
    // ledgerWarning stays in the response for older screens; it is always null now.
    res.json({ message: 'Fine marked as paid', ledgerWarning: null });
  } catch (error) {
    if (error instanceof RequestRefused) return res.status(error.status).json({ error: error.message });
    console.error('Pay fine error:', error.message);
    res.status(500).json({ error: 'Could not mark the fine as paid. Nothing was changed, so it is safe to try again.' });
  }
}

// ---------- Constitution ----------

export async function getConstitution(req, res) {
  try {
    if (!(await guard(req, res))) return;
    const rows = await prisma.$queryRaw`
      SELECT "data", "updatedAt" FROM "StokvelConstitution" WHERE "stokvelId" = ${req.params.stokvelId}`;
    if (rows.length === 0) return res.status(404).json({ error: 'No constitution yet' });
    res.json({ ...rows[0].data, updatedAt: rows[0].updatedAt });
  } catch (error) {
    console.error('Get constitution error:', error.message);
    res.status(500).json({ error: 'Could not load constitution' });
  }
}

export async function saveConstitution(req, res) {
  try {
    if (!(await guard(req, res, { officialOnly: true }))) return;
    // Keep only plain string fields, so the document can't grow without bound.
    const data = {};
    for (const [k, v] of Object.entries(req.body || {})) {
      if (k === 'updatedAt' || typeof v !== 'string') continue;
      data[k] = v.slice(0, 5000);
    }
    await prisma.$executeRaw`
      INSERT INTO "StokvelConstitution" ("stokvelId", "data", "updatedById", "updatedAt")
      VALUES (${req.params.stokvelId}, ${JSON.stringify(data)}::jsonb, ${req.userId}, CURRENT_TIMESTAMP)
      ON CONFLICT ("stokvelId") DO UPDATE
      SET "data" = EXCLUDED."data", "updatedById" = EXCLUDED."updatedById", "updatedAt" = CURRENT_TIMESTAMP`;
    await logAudit(req.params.stokvelId, req.userId, 'Updated the constitution');
    res.json({ message: 'Constitution saved' });
  } catch (error) {
    console.error('Save constitution error:', error.message);
    res.status(500).json({ error: 'Could not save constitution' });
  }
}

// ---------- Audit trail ----------

export async function getAuditLog(req, res) {
  try {
    if (!(await guard(req, res))) return;
    const rows = await prisma.$queryRaw`
      SELECT "action", "actorName", "details", "createdAt" FROM "StokvelAuditLog"
      WHERE "stokvelId" = ${req.params.stokvelId} ORDER BY "createdAt" DESC LIMIT 100`;
    res.json(rows);
  } catch (error) {
    console.error('Get audit log error:', error.message);
    res.status(500).json({ error: 'Could not load audit trail' });
  }
}
