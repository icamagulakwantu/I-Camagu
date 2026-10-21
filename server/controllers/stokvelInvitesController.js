import { randomUUID } from 'crypto';
import prisma from '../config/db.js';
import { createNotification } from '../services/notificationDbService.js';
import { generateUniqueReference } from '../utils/referenceGenerator.js';

// The invite table is created the first time it is needed (same idempotent
// approach as server/scripts/ensure-schema.js), so no manual database step.
// Remembered per server start so it only runs once.
let tableReady = null;
function ensureInviteTable() {
  if (!tableReady) {
    tableReady = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "StokvelInvite" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "stokvelId" TEXT NOT NULL,
          "invitedUserId" TEXT NOT NULL,
          "invitedById" TEXT NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'PENDING',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "respondedAt" TIMESTAMP(3)
        );
      `);
      await prisma.$executeRawUnsafe(
        `CREATE UNIQUE INDEX IF NOT EXISTS "StokvelInvite_one_pending" ON "StokvelInvite" ("stokvelId", "invitedUserId") WHERE "status" = 'PENDING';`
      );
      await prisma.$executeRawUnsafe(
        'CREATE INDEX IF NOT EXISTS "StokvelInvite_invitedUserId_status_idx" ON "StokvelInvite" ("invitedUserId", "status");'
      );
    })().catch((err) => {
      tableReady = null; // try again next request
      throw err;
    });
  }
  return tableReady;
}

async function isOfficialOf(stokvelId, userId) {
  const [stokvel, official] = await Promise.all([
    prisma.stokvel.findUnique({ where: { id: stokvelId }, select: { organiserId: true, name: true } }),
    prisma.stokvelOfficial.findFirst({ where: { stokvelId, userId } }),
  ]);
  return { stokvel, allowed: Boolean(stokvel) && (Boolean(official) || stokvel.organiserId === userId) };
}

// Find people to invite. With no search words it shows the person's accepted
// iziduko family connections; with words it searches names and usernames.
// Only name and username are ever returned, never contact details.
export async function searchPeople(req, res) {
  const userId = req.userId;
  const q = String(req.query.q || '').trim();
  const stokvelId = String(req.query.stokvelId || '');
  try {
    const { allowed } = await isOfficialOf(stokvelId, userId);
    if (!allowed) return res.status(403).json({ error: 'Only officials can invite people' });

    const [members, connections] = await Promise.all([
      prisma.stokvelMember.findMany({ where: { stokvelId }, select: { userId: true } }),
      prisma.clanConnection.findMany({
        where: { status: 'ACCEPTED', OR: [{ requesterId: userId }, { recipientId: userId }] },
        select: { requesterId: true, recipientId: true },
      }),
    ]);
    const memberIds = new Set(members.map((m) => m.userId));
    const familyIds = new Set(connections.map((c) => (c.requesterId === userId ? c.recipientId : c.requesterId)));

    if (q.length > 0 && q.length < 2) return res.json([]);

    const where = q
      ? {
          id: { not: userId },
          OR: [
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName: { contains: q, mode: 'insensitive' } },
            { username: { contains: q, mode: 'insensitive' } },
          ],
        }
      : { id: { in: [...familyIds] } };

    const users = await prisma.user.findMany({
      where,
      select: { id: true, firstName: true, lastName: true, username: true },
      take: 15,
    });

    res.json(
      users.map((u) => ({
        userId: u.id,
        name: `${u.firstName} ${u.lastName}`.trim(),
        username: u.username,
        isFamily: familyIds.has(u.id),
        alreadyMember: memberIds.has(u.id),
      }))
    );
  } catch (error) {
    console.error('Search people error:', error.message);
    res.status(500).json({ error: 'Could not search for people' });
  }
}

// An official invites a person. The person is NOT added: they get a
// notification and must accept first.
export async function sendInvite(req, res) {
  const { stokvelId } = req.params;
  const { userId: invitedUserId } = req.body;
  const userId = req.userId;
  if (!invitedUserId) return res.status(400).json({ error: 'Choose who to invite' });

  try {
    await ensureInviteTable();
    const { stokvel, allowed } = await isOfficialOf(stokvelId, userId);
    if (!stokvel) return res.status(404).json({ error: 'Stokvel not found' });
    if (!allowed) return res.status(403).json({ error: 'Only officials can invite people' });

    const invitee = await prisma.user.findUnique({ where: { id: invitedUserId }, select: { id: true, firstName: true } });
    if (!invitee) return res.status(404).json({ error: 'That person was not found' });

    const alreadyIn = await prisma.stokvelMember.findFirst({ where: { stokvelId, userId: invitedUserId } });
    if (alreadyIn) return res.status(409).json({ error: 'That person is already in this stokvel' });

    const pending = await prisma.$queryRaw`
      SELECT 1 FROM "StokvelInvite"
      WHERE "stokvelId" = ${stokvelId} AND "invitedUserId" = ${invitedUserId} AND "status" = 'PENDING' LIMIT 1`;
    if (pending.length) return res.status(409).json({ error: 'You already invited this person. Waiting for their answer.' });

    await prisma.$executeRaw`
      INSERT INTO "StokvelInvite" ("id", "stokvelId", "invitedUserId", "invitedById")
      VALUES (${randomUUID()}, ${stokvelId}, ${invitedUserId}, ${userId})`;

    const inviter = await prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true } });
    await createNotification(
      invitedUserId,
      'STOKVEL_INVITE',
      `${inviter?.firstName || 'Someone'} ${inviter?.lastName || ''} invited you to join the stokvel "${stokvel.name}". Open the app to accept or decline.`.replace(/\s+/g, ' '),
      'stokvels'
    ).catch((err) => console.error('Invite notification failed:', err.message));

    res.status(201).json({ message: `Invitation sent to ${invitee.firstName}` });
  } catch (error) {
    console.error('Send invite error:', error.message);
    res.status(500).json({ error: 'Could not send the invitation' });
  }
}

// Invitations an official has sent that are still waiting for an answer.
export async function listSentInvites(req, res) {
  const { stokvelId } = req.params;
  try {
    await ensureInviteTable();
    const { allowed } = await isOfficialOf(stokvelId, req.userId);
    if (!allowed) return res.status(403).json({ error: 'Only officials can see invitations' });

    const rows = await prisma.$queryRaw`
      SELECT i."id", i."createdAt", u."firstName", u."lastName"
      FROM "StokvelInvite" i JOIN "User" u ON u."id" = i."invitedUserId"
      WHERE i."stokvelId" = ${stokvelId} AND i."status" = 'PENDING'
      ORDER BY i."createdAt" DESC LIMIT 50`;
    res.json(rows.map((r) => ({ id: r.id, name: `${r.firstName} ${r.lastName}`.trim(), createdAt: r.createdAt })));
  } catch (error) {
    console.error('List sent invites error:', error.message);
    res.status(500).json({ error: 'Could not load invitations' });
  }
}

// Invitations waiting for the signed-in person to answer.
export async function listMyInvites(req, res) {
  try {
    await ensureInviteTable();
    const rows = await prisma.$queryRaw`
      SELECT i."id", i."createdAt", s."name" AS "stokvelName",
             u."firstName", u."lastName"
      FROM "StokvelInvite" i
      JOIN "Stokvel" s ON s."id" = i."stokvelId"
      JOIN "User" u ON u."id" = i."invitedById"
      WHERE i."invitedUserId" = ${req.userId} AND i."status" = 'PENDING'
      ORDER BY i."createdAt" DESC LIMIT 20`;
    res.json(rows.map((r) => ({
      id: r.id,
      stokvelName: r.stokvelName,
      invitedBy: `${r.firstName} ${r.lastName}`.trim(),
      createdAt: r.createdAt,
    })));
  } catch (error) {
    console.error('List my invites error:', error.message);
    res.status(500).json({ error: 'Could not load your invitations' });
  }
}

async function nextReferenceCode(firstName, count) {
  const initials = (firstName || 'MEM').slice(0, 3).toUpperCase().padEnd(3, 'X');
  const base = `STK-${initials}-${String(count + 1).padStart(3, '0')}`;
  const exists = async (code) => !!(await prisma.stokvelMember.findFirst({ where: { referenceCode: code } }));
  if (!(await exists(base))) return base;
  return generateUniqueReference(`STK-${initials}`, exists);
}

// The invited person answers. Accepting is what adds them to the stokvel.
export async function respondToInvite(req, res) {
  const { inviteId } = req.params;
  const accept = req.body.accept === true;
  const userId = req.userId;
  try {
    await ensureInviteTable();
    const rows = await prisma.$queryRaw`
      SELECT "id", "stokvelId", "invitedById" FROM "StokvelInvite"
      WHERE "id" = ${inviteId} AND "invitedUserId" = ${userId} AND "status" = 'PENDING' LIMIT 1`;
    const invite = rows[0];
    if (!invite) return res.status(404).json({ error: 'This invitation is no longer open' });

    const [stokvel, me] = await Promise.all([
      prisma.stokvel.findUnique({ where: { id: invite.stokvelId }, select: { name: true } }),
      prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true } }),
    ]);

    // Closing the invitation first, only if still pending, so a double tap
    // cannot add the person twice.
    const closed = await prisma.$executeRaw`
      UPDATE "StokvelInvite" SET "status" = ${accept ? 'ACCEPTED' : 'DECLINED'}, "respondedAt" = NOW()
      WHERE "id" = ${inviteId} AND "status" = 'PENDING'`;
    if (closed === 0) return res.status(409).json({ error: 'This invitation was already answered' });

    if (accept) {
      const already = await prisma.stokvelMember.findFirst({ where: { stokvelId: invite.stokvelId, userId } });
      if (!already) {
        const count = await prisma.stokvelMember.count({ where: { stokvelId: invite.stokvelId } });
        const referenceCode = await nextReferenceCode(me?.firstName, count);
        await prisma.stokvelMember.create({ data: { stokvelId: invite.stokvelId, userId, referenceCode } });
      }
    }

    await createNotification(
      invite.invitedById,
      'STOKVEL_INVITE_ANSWER',
      `${me?.firstName || 'Your invitee'} ${accept ? 'accepted' : 'declined'} your invitation to "${stokvel?.name}".`,
      'stokvels'
    ).catch((err) => console.error('Answer notification failed:', err.message));

    res.json({ message: accept ? `You joined ${stokvel?.name}` : 'Invitation declined', joined: accept });
  } catch (error) {
    console.error('Respond to invite error:', error.message);
    res.status(500).json({ error: 'Could not save your answer' });
  }
}
