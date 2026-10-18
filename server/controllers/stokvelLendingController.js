import { randomUUID } from 'crypto';
import prisma from '../config/db.js';
import { logAudit } from './stokvelRecordsController.js';

// Umbutho lending targets. Each member must raise a target amount by lending
// money out and bringing it back with interest. Officials set the target;
// a member records each round (amount lent out, amount brought back) and the
// profit counts towards their target. Tables are created lazily, like the
// rest of the stokvel finance code (this project has no migrations).

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
    const [users, targets, sums] = await Promise.all([
      prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, firstName: true, lastName: true } }),
      prisma.$queryRaw`SELECT "memberId", "target" FROM "StokvelLendingTarget" WHERE "stokvelId" = ${stokvelId}`,
      prisma.$queryRaw`SELECT "memberId", SUM("lent") AS lent, SUM("returned") AS returned, COUNT(*) AS rounds
        FROM "StokvelLendingEntry" WHERE "stokvelId" = ${stokvelId} GROUP BY "memberId"`,
    ]);
    const targetMap = Object.fromEntries(targets.map((t) => [t.memberId, Number(t.target)]));
    const sumMap = Object.fromEntries(sums.map((s) => [s.memberId, s]));
    const rows = users.map((u) => {
      const s = sumMap[u.id];
      const lent = s ? Number(s.lent) : 0;
      const returned = s ? Number(s.returned) : 0;
      const raised = Math.max(0, returned - lent);
      const target = targetMap[u.id] || 0;
      return {
        memberId: u.id,
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Member',
        target, lent, returned, raised,
        rounds: s ? Number(s.rounds) : 0,
        percent: target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0,
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
    const target = Number(req.body?.target);
    if (!(target > 0 && target <= 10_000_000)) return res.status(400).json({ error: 'Enter a target amount above zero' });
    const all = await memberIdsOf(stokvelId, role.organiserId);
    const ids = req.body?.memberId ? [req.body.memberId] : all;
    if (!ids.every((id) => all.includes(id))) return res.status(400).json({ error: 'That person is not in this stokvel' });
    for (const memberId of ids) {
      await prisma.$executeRaw`
        INSERT INTO "StokvelLendingTarget" ("stokvelId", "memberId", "target") VALUES (${stokvelId}, ${memberId}, ${target})
        ON CONFLICT ("stokvelId", "memberId") DO UPDATE SET "target" = EXCLUDED."target", "updatedAt" = CURRENT_TIMESTAMP`;
    }
    await logAudit(stokvelId, req.userId, 'Set a lending target', `R${target.toFixed(2)} for ${ids.length === 1 && req.body?.memberId ? '1 member' : 'every member'}`);
    res.json({ message: 'Target saved' });
  } catch (error) {
    console.error('Set lending target error:', error.message);
    res.status(500).json({ error: 'Could not save the target' });
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
    const lent = Number(req.body?.lent);
    const returned = Number(req.body?.returned);
    if (!(lent > 0)) return res.status(400).json({ error: 'Enter the amount you lent out' });
    if (!(returned >= 0)) return res.status(400).json({ error: 'Enter the amount that came back' });
    const note = String(req.body?.note || '').trim().slice(0, 300) || null;
    await prisma.$executeRaw`
      INSERT INTO "StokvelLendingEntry" ("id", "stokvelId", "memberId", "lent", "returned", "note", "recordedById")
      VALUES (${randomUUID()}, ${stokvelId}, ${memberId}, ${lent}, ${returned}, ${note}, ${req.userId})`;
    await logAudit(stokvelId, req.userId, 'Recorded a lending round', `Lent R${lent.toFixed(2)}, brought back R${returned.toFixed(2)}`);
    res.status(201).json({ message: 'Lending round recorded' });
  } catch (error) {
    console.error('Record lending round error:', error.message);
    res.status(500).json({ error: 'Could not record the lending round' });
  }
}
