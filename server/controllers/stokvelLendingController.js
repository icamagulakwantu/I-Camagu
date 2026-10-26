import { randomUUID } from 'crypto';
import prisma from '../config/db.js';
import { logAuditQuietly } from './stokvelRecordsController.js';
import { toCents, fromCents } from '../utils/money.js';

// Umbutho lending targets. Each member must raise a target amount by lending
// money out and bringing it back with interest. Officials set the target;
// a member records each round (amount lent out, amount brought back) and the
// profit counts towards their target. Tables are created lazily, like the
// rest of the stokvel finance code (this project has no migrations).
//
// FIN-04: every amount is handled as whole cents. Amounts with more than two
// decimals are refused rather than rounded, and sums are read back from the
// database as exact text, never as floating point.

const MAX_AMOUNT_CENTS = 1_000_000_000; // R10 million, well inside DECIMAL(12,2)

let ready = null;
function ensureTables() {
  if (!ready) {
    ready = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "StokvelLendingTarget" (
          "stokvelId" TEXT NOT NULL,
          "memberId" TEXT NOT NULL,
          "target" DECIMAL(12,2) NOT NULL,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY ("stokvelId", "memberId")
        );
      `);
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "StokvelLendingEntry" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "stokvelId" TEXT NOT NULL,
          "memberId" TEXT NOT NULL,
          "lent" DECIMAL(12,2) NOT NULL,
          "returned" DECIMAL(12,2) NOT NULL,
          "note" TEXT,
          "recordedById" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await prisma.$executeRawUnsafe(
        'CREATE INDEX IF NOT EXISTS "StokvelLendingEntry_stokvel_idx" ON "StokvelLendingEntry" ("stokvelId", "memberId");'
      );
    })().catch((err) => { ready = null; throw err; });
  }
  return ready;
}

// Parses a money amount into whole cents. Returns null for anything that is
// not a plain number with at most 2 decimals, or is outside [minCents, R10m].
// Exported for unit tests.
export function parseAmountCents(raw, { minCents = 1 } = {}) {
  if (raw === null || raw === undefined) return null;
  let cents;
  try { cents = toCents(String(raw)); } catch { return null; }
  if (cents < minCents || cents > MAX_AMOUNT_CENTS) return null;
  return cents;
}

// A database DECIMAL (or SUM of one), read back as text, as exact cents.
// Exported for unit tests.
export function dbCents(value) {
  if (value === null || value === undefined) return 0;
  return toCents(String(value));
}

// Progress towards a lending target, worked out in whole cents.
// Exported for unit tests.
export function lendingProgress({ lentCents, returnedCents, targetCents }) {
  const raisedCents = Math.max(0, returnedCents - lentCents);
  const percent = targetCents > 0 ? Math.min(100, Math.floor((raisedCents * 100) / targetCents)) : 0;
  return { raisedCents, percent };
}

async function guard(req, res, { officialOnly = false } = {}) {
  await ensureTables();
  const { stokvelId } = req.params;
  const [stokvel, member, official] = await Promise.all([
    prisma.stokvel.findUnique({ where: { id: stokvelId }, select: { organiserId: true } }),
    prisma.stokvelMember.findFirst({ where: { stokvelId, userId: req.userId } }),
    prisma.stokvelOfficial.findFirst({ where: { stokvelId, userId: req.userId } }),
  ]);
  if (!stokvel) { res.status(404).json({ error: 'Stokvel not found' }); return null; }
  const isOfficial = Boolean(official) || stokvel.organiserId === req.userId;
  if (!member && !isOfficial) { res.status(403).json({ error: 'Not a member of this stokvel' }); return null; }
  if (officialOnly && !isOfficial) { res.status(403).json({ error: 'Only officials can set lending targets' }); return null; }
  return { isOfficial, organiserId: stokvel.organiserId };
}

async function memberIdsOf(stokvelId, organiserId) {
  const members = await prisma.stokvelMember.findMany({ where: { stokvelId }, select: { userId: true }, take: 500 });
  return [...new Set([organiserId, ...members.map((m) => m.userId)].filter(Boolean))];
}

export async function listLendingTargets(req, res) {
  try {
    const role = await guard(req, res);
    if (!role) return;
    const { stokvelId } = req.params;
    const ids = await memberIdsOf(stokvelId, role.organiserId);
    // Amounts come back as exact text so no cent is lost to floating point.
    const [users, targets, sums] = await Promise.all([
      prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, firstName: true, lastName: true } }),
      prisma.$queryRaw`SELECT "memberId", "target"::text AS target FROM "StokvelLendingTarget" WHERE "stokvelId" = ${stokvelId}`,
      prisma.$queryRaw`SELECT "memberId", SUM("lent")::text AS lent, SUM("returned")::text AS returned, COUNT(*) AS rounds
        FROM "StokvelLendingEntry" WHERE "stokvelId" = ${stokvelId} GROUP BY "memberId"`,
    ]);
    const targetMap = Object.fromEntries(targets.map((t) => [t.memberId, dbCents(t.target)]));
    const sumMap = Object.fromEntries(sums.map((s) => [s.memberId, s]));
    const rows = users.map((u) => {
      const s = sumMap[u.id];
      const lentCents = s ? dbCents(s.lent) : 0;
      const returnedCents = s ? dbCents(s.returned) : 0;
      const targetCents = targetMap[u.id] || 0;
      const { raisedCents, percent } = lendingProgress({ lentCents, returnedCents, targetCents });
      // Response shape unchanged: amounts in rand, as numbers.
      return {
        memberId: u.id,
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Member',
        target: targetCents / 100, lent: lentCents / 100, returned: returnedCents / 100, raised: raisedCents / 100,
        rounds: s ? Number(s.rounds) : 0,
        percent,
        isMe: u.id === req.userId,
      };
    }).sort((a, b) => (b.isMe - a.isMe) || (b.percent - a.percent));
    res.json({ isOfficial: role.isOfficial, members: rows });
  } catch (error) {
    console.error('List lending targets error:', error.message);
    res.status(500).json({ error: 'Could not load lending targets' });
  }
}

// Body: { target, memberId? } — without memberId the target is set for every member.
export async function setLendingTarget(req, res) {
  try {
    const role = await guard(req, res, { officialOnly: true });
    if (!role) return;
    const { stokvelId } = req.params;
    const targetCents = parseAmountCents(req.body?.target);
    if (targetCents === null) {
      return res.status(400).json({ error: 'Enter a target above zero and up to R10 000 000 (at most 2 decimals)' });
    }
    const all = await memberIdsOf(stokvelId, role.organiserId);
    const ids = req.body?.memberId ? [req.body.memberId] : all;
    if (!ids.every((id) => all.includes(id))) return res.status(400).json({ error: 'That person is not in this stokvel' });
    const target = fromCents(targetCents);
    // Every member gets the new target, or none do (previously a failure part
    // way through left some members on the old target).
    await prisma.$transaction(async (tx) => {
      for (const memberId of ids) {
        await tx.$executeRaw`
          INSERT INTO "StokvelLendingTarget" ("stokvelId", "memberId", "target") VALUES (${stokvelId}, ${memberId}, ${target}::numeric)
          ON CONFLICT ("stokvelId", "memberId") DO UPDATE SET "target" = EXCLUDED."target", "updatedAt" = CURRENT_TIMESTAMP`;
      }
    });
    await logAuditQuietly(stokvelId, req.userId, 'Set a lending target', `R${target} for ${req.body?.memberId ? '1 member' : 'every member'}`);
    res.json({ message: 'Target saved' });
  } catch (error) {
    console.error('Set lending target error:', error.message);
    res.status(500).json({ error: 'Could not save the target. Nothing was changed, so it is safe to try again.' });
  }
}

// Body: { lent, returned, note?, memberId? } — members record their own rounds; officials may record for anyone.
export async function recordLendingRound(req, res) {
  try {
    const role = await guard(req, res);
    if (!role) return;
    const { stokvelId } = req.params;
    const memberId = req.body?.memberId || req.userId;
    if (memberId !== req.userId && !role.isOfficial) return res.status(403).json({ error: 'You can only record your own lending' });
    const all = await memberIdsOf(stokvelId, role.organiserId);
    if (!all.includes(memberId)) return res.status(400).json({ error: 'That person is not in this stokvel' });
    const lentCents = parseAmountCents(req.body?.lent);
    const returnedCents = parseAmountCents(req.body?.returned, { minCents: 0 });
    if (lentCents === null) return res.status(400).json({ error: 'Enter the amount you lent out (above zero, at most 2 decimals)' });
    if (returnedCents === null) return res.status(400).json({ error: 'Enter the amount that came back (at most 2 decimals)' });
    const note = String(req.body?.note || '').trim().slice(0, 300) || null;
    const lent = fromCents(lentCents);
    const returned = fromCents(returnedCents);
    await prisma.$executeRaw`
      INSERT INTO "StokvelLendingEntry" ("id", "stokvelId", "memberId", "lent", "returned", "note", "recordedById")
      VALUES (${randomUUID()}, ${stokvelId}, ${memberId}, ${lent}::numeric, ${returned}::numeric, ${note}, ${req.userId})`;
    // The round is saved; a failed audit line is logged, not returned as an
    // error (that would invite a duplicate round).
    await logAuditQuietly(stokvelId, req.userId, 'Recorded a lending round', `Lent R${lent}, brought back R${returned}`);
    res.status(201).json({ message: 'Lending round recorded' });
  } catch (error) {
    console.error('Record lending round error:', error.message);
    res.status(500).json({ error: 'Could not record the lending round' });
  }
}
