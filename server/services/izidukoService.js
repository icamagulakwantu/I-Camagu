import prisma from '../config/db.js';
import { matchClan } from './clanMatchService.js';

// Resolves any registered alias to its canonical clan name. If no alias is
// registered, treats the input as already canonical — we never fuzzy-match.
async function resolveCanonicalClanName(inputName) {
  if (!inputName) return null;
  const match = await matchClan(inputName);
  // Only a unique exact head/alias match resolves. Fuzzy suggestions and
  // ambiguous spellings are not used for clan connections or group sync.
  return match.autoSelect ? match.results[0]?.head || null : null;
}

async function findOrCreateClanGroup(clanName) {
  if (!clanName) return null;
  const existing = await prisma.clanGroup.findUnique({ where: { clanName } });
  if (existing) return existing;

  try {
    return await prisma.clanGroup.create({ data: { clanName } });
  } catch (error) {
    if (error.code === 'P2002') return prisma.clanGroup.findUnique({ where: { clanName } });
    throw error;
  }
}

async function findOrCreateSurnameSubgroup(clanGroupId, surname) {
  if (!surname) return null;
  const existing = await prisma.surnameSubgroup.findUnique({
    where: { clanGroupId_surname: { clanGroupId, surname } },
  });
  if (existing) return existing;

  try {
    return await prisma.surnameSubgroup.create({ data: { clanGroupId, surname } });
  } catch (error) {
    if (error.code === 'P2002') {
      return prisma.surnameSubgroup.findUnique({ where: { clanGroupId_surname: { clanGroupId, surname } } });
    }
    throw error;
  }
}

export async function syncUserClanGroups(user) {
  const clanNames = [
    user.paternalIziduko,
    user.maternalIziduko,
    user.paternalGrandmotherIziduko,
    user.maternalGrandmotherIziduko,
  ];

  for (const clanName of clanNames) {
    const canonical = await resolveCanonicalClanName(clanName);
    if (canonical) {
      const clanGroup = await prisma.clanGroup.findFirst({
        where: { clanName: { equals: canonical, mode: 'insensitive' } },
      });
      if (clanGroup) await findOrCreateSurnameSubgroup(clanGroup.id, user.lastName);
    }
  }
}

export async function findClanMatches(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return [];

  const ownFields = [
    ['paternal', await resolveCanonicalClanName(user.paternalIziduko)],
    ['maternal', await resolveCanonicalClanName(user.maternalIziduko)],
    ['paternal grandmother', await resolveCanonicalClanName(user.paternalGrandmotherIziduko)],
    ['maternal grandmother', await resolveCanonicalClanName(user.maternalGrandmotherIziduko)],
  ].filter(([, value]) => value);

  if (ownFields.length === 0) return [];

  const allUsers = await prisma.user.findMany({
    where: {
      id: { not: userId },
      profileImage: { not: null },
      paternalIziduko: { not: null },
      maternalIziduko: { not: null },
    },
    select: {
      id: true, firstName: true, lastName: true, profileImage: true,
      paternalIziduko: true, maternalIziduko: true,
      paternalGrandmotherIziduko: true, maternalGrandmotherIziduko: true,
    },
  });

  const matches = [];
  for (const other of allUsers) {
    const otherFields = [
      ['paternal', await resolveCanonicalClanName(other.paternalIziduko)],
      ['maternal', await resolveCanonicalClanName(other.maternalIziduko)],
      ['paternal grandmother', await resolveCanonicalClanName(other.paternalGrandmotherIziduko)],
      ['maternal grandmother', await resolveCanonicalClanName(other.maternalGrandmotherIziduko)],
    ];

    const matchedLines = ownFields
      .filter(([, ownClan]) => otherFields.some(([, otherClan]) => ownClan === otherClan))
      .map(([line]) => line);

    if (matchedLines.length === 0) continue;

    const sameSurname = user.lastName?.trim().toLowerCase() === other.lastName?.trim().toLowerCase();
    matches.push({ ...other, matchedLines, sameSurname });
  }

  return matches;
}

export async function registerClanAlias(aliasForm, canonicalClanName) {
  const clanGroup = await findOrCreateClanGroup(canonicalClanName);
  return prisma.clanAlias.upsert({
    where: { aliasForm },
    update: { clanGroupId: clanGroup.id },
    create: { aliasForm, clanGroupId: clanGroup.id },
  });
}

// ---------- CLAN CONNECTIONS (request -> accept, never raw broadcast) ----------

async function isConfirmedClanMatch(userAId, userBId) {
  const matches = await findClanMatches(userAId);
  return matches.some((m) => m.id === userBId);
}

export async function sendClanConnectionRequest(requesterId, recipientId, message) {
  if (requesterId === recipientId) {
    const err = new Error('You cannot send a connection request to yourself');
    err.status = 400;
    throw err;
  }

  const isMatch = await isConfirmedClanMatch(requesterId, recipientId);
  if (!isMatch) {
    const err = new Error('You can only connect with confirmed clan matches');
    err.status = 403;
    throw err;
  }

  const reverse = await prisma.clanConnection.findUnique({
    where: { requesterId_recipientId: { requesterId: recipientId, recipientId: requesterId } },
  });

  if (reverse) {
    if (reverse.status === 'ACCEPTED') return { connection: reverse, mutual: false };
    if (reverse.status === 'PENDING') {
      const connection = await prisma.clanConnection.update({
        where: { id: reverse.id },
        data: { status: 'ACCEPTED', respondedAt: new Date() },
      });
      return { connection, mutual: true };
    }
    // reverse.status === 'DECLINED' — fall through and let them try a fresh request
  }

  try {
    const connection = await prisma.clanConnection.create({
      data: { requesterId, recipientId, message: message?.trim() || null },
    });
    return { connection, mutual: false };
  } catch (error) {
    if (error.code === 'P2002') {
      const err = new Error('You already sent a connection request to this person');
      err.status = 409;
      throw err;
    }
    throw error;
  }
}

export async function respondToClanConnectionRequest(connectionId, recipientId, accept) {
  const connection = await prisma.clanConnection.findUnique({ where: { id: connectionId } });
  if (!connection) {
    const err = new Error('Connection request not found');
    err.status = 404;
    throw err;
  }
  if (connection.recipientId !== recipientId) {
    const err = new Error('You are not authorized to respond to this request');
    err.status = 403;
    throw err;
  }
  if (connection.status !== 'PENDING') {
    const err = new Error('This request has already been responded to');
    err.status = 409;
    throw err;
  }

  return prisma.clanConnection.update({
    where: { id: connectionId },
    data: { status: accept ? 'ACCEPTED' : 'DECLINED', respondedAt: new Date() },
  });
}

export async function withdrawClanConnectionRequest(connectionId, requesterId) {
  const connection = await prisma.clanConnection.findUnique({ where: { id: connectionId } });
  if (!connection) {
    const err = new Error('Connection request not found');
    err.status = 404;
    throw err;
  }
  if (connection.requesterId !== requesterId) {
    const err = new Error('You are not authorized to withdraw this request');
    err.status = 403;
    throw err;
  }
  if (connection.status !== 'PENDING') {
    const err = new Error('This request has already been responded to');
    err.status = 409;
    throw err;
  }

  await prisma.clanConnection.delete({ where: { id: connectionId } });
}

const REQUEST_USER_SELECT = {
  id: true, firstName: true, lastName: true, profileImage: true,
  paternalIziduko: true, maternalIziduko: true,
};

export async function getClanConnectionRequests(userId) {
  const [incoming, outgoing] = await Promise.all([
    prisma.clanConnection.findMany({
      where: { recipientId: userId, status: 'PENDING' },
      include: { requester: { select: REQUEST_USER_SELECT } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.clanConnection.findMany({
      where: { requesterId: userId, status: 'PENDING' },
      include: { recipient: { select: REQUEST_USER_SELECT } },
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  return { incoming, outgoing };
}

export async function getClanConnections(userId) {
  const connections = await prisma.clanConnection.findMany({
    where: { status: 'ACCEPTED', OR: [{ requesterId: userId }, { recipientId: userId }] },
    include: {
      requester: { select: { ...REQUEST_USER_SELECT, phoneNumber: true } },
      recipient: { select: { ...REQUEST_USER_SELECT, phoneNumber: true } },
    },
    orderBy: { respondedAt: 'desc' },
  });
  return connections.map((c) => (c.requesterId === userId ? c.recipient : c.requester));
}

export async function getConnectionStatusesForUsers(userId, otherUserIds) {
  if (otherUserIds.length === 0) return {};

  const rows = await prisma.clanConnection.findMany({
    where: {
      OR: [
        { requesterId: userId, recipientId: { in: otherUserIds } },
        { recipientId: userId, requesterId: { in: otherUserIds } },
      ],
    },
  });

  const map = {};
  for (const row of rows) {
    const otherId = row.requesterId === userId ? row.recipientId : row.requesterId;
    const iAmRequester = row.requesterId === userId;
    let status = 'none';
    if (row.status === 'ACCEPTED') status = 'connected';
    else if (row.status === 'PENDING') status = iAmRequester ? 'pending_sent' : 'pending_received';
    map[otherId] = { status, connectionId: row.id };
  }
  return map;
}

// Whether two users have a mutually-accepted clan connection — the one gate
// that decides both "can I view their full profile" and "can I message
// them" (see getConnectedUserProfile below and messageService.js). Exported
// since messageService needs the exact same check.
export async function isAcceptedConnection(userAId, userBId) {
  const connection = await prisma.clanConnection.findFirst({
    where: {
      status: 'ACCEPTED',
      OR: [
        { requesterId: userAId, recipientId: userBId },
        { requesterId: userBId, recipientId: userAId },
      ],
    },
  });
  return !!connection;
}

// The same personal-detail fields a member sees on their own Profile
// screen's "Personal" tab (address/age/phoneNumber) plus their photo, name
// and four Iziduko lines — deliberately NOT identity-verification fields
// (ID number, ID document, verification status), which Profile.jsx already
// treats as never shown to other members, even connected ones.
const FULL_PROFILE_SELECT = {
  id: true, firstName: true, lastName: true, profileImage: true,
  paternalIziduko: true, maternalIziduko: true,
  paternalGrandmotherIziduko: true, maternalGrandmotherIziduko: true,
  address: true, age: true, phoneNumber: true,
};

export async function getConnectedUserProfile(viewerId, targetId) {
  const connected = await isAcceptedConnection(viewerId, targetId);
  if (!connected) {
    const err = new Error('You can only view the full profile of someone you are connected with');
    err.status = 403;
    throw err;
  }

  const profile = await prisma.user.findUnique({ where: { id: targetId }, select: FULL_PROFILE_SELECT });
  if (!profile) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  return profile;
}
