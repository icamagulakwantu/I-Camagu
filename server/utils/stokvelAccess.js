import prisma from '../config/db.js';

// One place that answers "who is this person in this stokvel?". Every ledger
// action checks this on the server; hiding a button is never the protection.
export async function getStokvelRole(stokvelId, userId) {
  const [stokvel, member, official] = await Promise.all([
    prisma.stokvel.findUnique({ where: { id: stokvelId }, select: { organiserId: true } }),
    prisma.stokvelMember.findFirst({ where: { stokvelId, userId } }),
    prisma.stokvelOfficial.findFirst({ where: { stokvelId, userId } }),
  ]);
  if (!stokvel) return { exists: false, isMember: false, isOfficial: false };
  const isOfficial = Boolean(official) || stokvel.organiserId === userId;
  return { exists: true, isMember: Boolean(member) || isOfficial, isOfficial };
}
