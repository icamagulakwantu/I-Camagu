import { randomBytes, randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import prisma from '../config/db.js';

// Clan groups: a family/clan group (e.g. AmaCirha of Mdantsane) that people
// can start, join with one invite link, or find because it matches their own
// iziduko. Built so an existing WhatsApp clan group can move over: the
// organiser shares one link into the WhatsApp group and everyone who taps it
// is added. (WhatsApp groups can't be read or imported directly.)
//
// Tables are created the first time they're needed, the same way the ledger
// and stokvel records tables are, so no manual database step is required.
// Named ClanCircle* so they never clash with the existing ClanGroup model,
// which is the clan-name registry used for matching.

let ready = null;
function ensureTables() {
  if (!ready) {
    ready = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "ClanCircle" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "clanName" TEXT NOT NULL,
          "clanKey" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "description" TEXT,
          "creatorId" TEXT NOT NULL,
          "inviteCode" TEXT NOT NULL UNIQUE,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "ClanCircle_clanKey_idx" ON "ClanCircle"("clanKey")');
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "ClanCircleMember" (
          "circleId" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "role" TEXT NOT NULL DEFAULT 'MEMBER',
          "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY ("circleId", "userId")
        )
      `);
      await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "ClanCircleMember_userId_idx" ON "ClanCircleMember"("userId")');
    })().catch((err) => {
      ready = null;
      throw err;
    });
  }
  return ready;
}

// "AmaCirha", "amacirha", "Cirha" and "Ama-Cirha" all mean the same clan,
// and so do "OoJwarha" and "Jwarha". Only these two prefixes are stripped,
// since others (aba-, ka-) are also the start of real clan names.
export function clanKey(name) {
  return (name || '')
    .trim()
    .toLowerCase()
    .replace(/^(ama|oo)[\s-]?/, '')
    .replace(/[^a-z]/g, '');
}

function fail(res, status, error) {
  res.status(status).json({ error });
  return null;
}

async function userClanKeys(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      paternalIziduko: true, maternalIziduko: true,
      paternalGrandmotherIziduko: true, maternalGrandmotherIziduko: true,
    },
  });
  if (!user) return [];
  return [...new Set(Object.values(user).map(clanKey).filter(Boolean))];
}

async function getMembership(circleId, userId) {
  const rows = await prisma.$queryRaw`
    SELECT "role" FROM "ClanCircleMember" WHERE "circleId" = ${circleId} AND "userId" = ${userId}`;
  return rows[0] || null;
}

async function addMember(circleId, userId, role = 'MEMBER') {
  await prisma.$executeRaw`
    INSERT INTO "ClanCircleMember" ("circleId", "userId", "role")
    VALUES (${circleId}, ${userId}, ${role})
    ON CONFLICT ("circleId", "userId") DO NOTHING`;
}

export async function listMyGroups(req, res) {
  try {
    await ensureTables();
    const rows = await prisma.$queryRaw`
      SELECT c."id", c."clanName", c."name", c."description", m."role",
        (SELECT COUNT(*)::int FROM "ClanCircleMember" x WHERE x."circleId" = c."id") AS "memberCount"
      FROM "ClanCircle" c
      JOIN "ClanCircleMember" m ON m."circleId" = c."id"
      WHERE m."userId" = ${req.userId}
      ORDER BY c."createdAt" DESC
      LIMIT 50`;
    res.json({ groups: rows });
  } catch (error) {
    console.error('List clan groups error:', error.message);
    res.status(500).json({ error: 'Could not load your clan groups' });
  }
}

// Groups for the person's own clan names that they are not in yet.
export async function listSuggestedGroups(req, res) {
  try {
    await ensureTables();
    const keys = await userClanKeys(req.userId);
    if (keys.length === 0) return res.json({ hasClan: false, groups: [] });
    const rows = await prisma.$queryRaw`
      SELECT c."id", c."clanName", c."name", c."description",
        (SELECT COUNT(*)::int FROM "ClanCircleMember" x WHERE x."circleId" = c."id") AS "memberCount"
      FROM "ClanCircle" c
      WHERE c."clanKey" IN (${Prisma.join(keys)})
        AND NOT EXISTS (
          SELECT 1 FROM "ClanCircleMember" me WHERE me."circleId" = c."id" AND me."userId" = ${req.userId}
        )
      ORDER BY "memberCount" DESC
      LIMIT 20`;
    res.json({ hasClan: true, groups: rows });
  } catch (error) {
    console.error('Suggested clan groups error:', error.message);
    res.status(500).json({ error: 'Could not load groups for your clan' });
  }
}

export async function createGroup(req, res) {
  const clanName = (req.body?.clanName || '').trim();
  const name = (req.body?.name || '').trim();
  const description = (req.body?.description || '').trim() || null;
  if (clanName.length < 2 || clanName.length > 40) return fail(res, 400, 'Please type the clan name, e.g. AmaCirha');
  if (name.length < 3 || name.length > 80) return fail(res, 400, 'Please give the group a name of at least 3 letters');
  if (description && description.length > 300) return fail(res, 400, 'Please keep the description under 300 letters');
  const key = clanKey(clanName);
  if (!key) return fail(res, 400, 'Please type the clan name using letters only');

  try {
    await ensureTables();
    const id = randomUUID();
    const inviteCode = randomBytes(6).toString('base64url');
    await prisma.$executeRaw`
      INSERT INTO "ClanCircle" ("id", "clanName", "clanKey", "name", "description", "creatorId", "inviteCode")
      VALUES (${id}, ${clanName}, ${key}, ${name}, ${description}, ${req.userId}, ${inviteCode})`;
    await addMember(id, req.userId, 'CREATOR');
    res.status(201).json({ id, clanName, name, description, inviteCode, role: 'CREATOR', memberCount: 1 });
  } catch (error) {
    console.error('Create clan group error:', error.message);
    res.status(500).json({ error: 'Could not start the clan group' });
  }
}

export async function getGroup(req, res) {
  try {
    await ensureTables();
    const membership = await getMembership(req.params.id, req.userId);
    if (!membership) return fail(res, 403, 'You are not in this clan group');
    const circles = await prisma.$queryRaw`
      SELECT "id", "clanName", "name", "description", "inviteCode", "creatorId"
      FROM "ClanCircle" WHERE "id" = ${req.params.id}`;
    if (!circles[0]) return fail(res, 404, 'Clan group not found');
    const members = await prisma.$queryRaw`
      SELECT m."userId", m."role", m."joinedAt", u."firstName", u."lastName"
      FROM "ClanCircleMember" m
      LEFT JOIN "User" u ON u."id" = m."userId"
      WHERE m."circleId" = ${req.params.id}
      ORDER BY (m."role" = 'CREATOR') DESC, m."joinedAt" ASC
      LIMIT 500`;
    res.json({ ...circles[0], role: membership.role, members });
  } catch (error) {
    console.error('Get clan group error:', error.message);
    res.status(500).json({ error: 'Could not load the clan group' });
  }
}

// Joining a suggested group: only allowed when the group's clan is one of
// the person's own iziduko lines. Anyone else needs the invite link.
export async function joinSuggestedGroup(req, res) {
  try {
    await ensureTables();
    const rows = await prisma.$queryRaw`SELECT "id", "clanKey", "name" FROM "ClanCircle" WHERE "id" = ${req.params.id}`;
    const circle = rows[0];
    if (!circle) return fail(res, 404, 'Clan group not found');
    const keys = await userClanKeys(req.userId);
    if (!keys.includes(circle.clanKey)) return fail(res, 403, 'This group is for another clan. Ask the organiser for the invite link.');
    await addMember(circle.id, req.userId);
    res.json({ id: circle.id, name: circle.name, message: `You have joined ${circle.name}` });
  } catch (error) {
    console.error('Join clan group error:', error.message);
    res.status(500).json({ error: 'Could not join the clan group' });
  }
}

export async function joinByCode(req, res) {
  const code = (req.body?.code || '').trim();
  if (!code) return fail(res, 400, 'That invite link is not complete');
  try {
    await ensureTables();
    const rows = await prisma.$queryRaw`SELECT "id", "name" FROM "ClanCircle" WHERE "inviteCode" = ${code}`;
    const circle = rows[0];
    if (!circle) return fail(res, 404, 'That invite link no longer works. Ask the organiser for a new one.');
    await addMember(circle.id, req.userId);
    res.json({ id: circle.id, name: circle.name, message: `You have joined ${circle.name}` });
  } catch (error) {
    console.error('Join clan group by code error:', error.message);
    res.status(500).json({ error: 'Could not join the clan group' });
  }
}

export async function leaveGroup(req, res) {
  try {
    await ensureTables();
    const membership = await getMembership(req.params.id, req.userId);
    if (!membership) return fail(res, 404, 'You are not in this clan group');
    if (membership.role === 'CREATOR') return fail(res, 400, 'You started this group, so you cannot leave it');
    await prisma.$executeRaw`DELETE FROM "ClanCircleMember" WHERE "circleId" = ${req.params.id} AND "userId" = ${req.userId}`;
    res.json({ message: 'You have left the group' });
  } catch (error) {
    console.error('Leave clan group error:', error.message);
    res.status(500).json({ error: 'Could not leave the clan group' });
  }
}

// Only the person who started the group can remove someone.
export async function removeMember(req, res) {
  try {
    await ensureTables();
    const membership = await getMembership(req.params.id, req.userId);
    if (membership?.role !== 'CREATOR') return fail(res, 403, 'Only the person who started the group can remove members');
    if (req.params.userId === req.userId) return fail(res, 400, 'You cannot remove yourself');
    await prisma.$executeRaw`DELETE FROM "ClanCircleMember" WHERE "circleId" = ${req.params.id} AND "userId" = ${req.params.userId}`;
    res.json({ message: 'Member removed' });
  } catch (error) {
    console.error('Remove clan group member error:', error.message);
    res.status(500).json({ error: 'Could not remove the member' });
  }
}

// A fresh link, for when the old one was shared somewhere it shouldn't be.
export async function resetInviteLink(req, res) {
  try {
    await ensureTables();
    const membership = await getMembership(req.params.id, req.userId);
    if (membership?.role !== 'CREATOR') return fail(res, 403, 'Only the person who started the group can change the link');
    const inviteCode = randomBytes(6).toString('base64url');
    await prisma.$executeRaw`UPDATE "ClanCircle" SET "inviteCode" = ${inviteCode} WHERE "id" = ${req.params.id}`;
    res.json({ inviteCode });
  } catch (error) {
    console.error('Reset clan invite link error:', error.message);
    res.status(500).json({ error: 'Could not make a new link' });
  }
}
