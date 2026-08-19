import prisma from '../config/db.js';

// Resolves any registered alias to its canonical clan name. If no alias is
// registered, treats the input as already canonical — we never fuzzy-match.
async function resolveCanonicalClanName(inputName) {
  if (!inputName) return null;
  const trimmed = inputName.trim();
  const alias = await prisma.clanAlias.findUnique({
    where: { aliasForm: trimmed },
    include: { clanGroup: true },
  });
  return alias ? alias.clanGroup.clanName : trimmed;
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
      const clanGroup = await findOrCreateClanGroup(canonical);
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
