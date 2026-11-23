// AmaCethe and AmaCete are the same clan (founder, 23 Nov 2026): Cete is the
// ancestor, AmaCete the plural, MamCete what a woman of the clan calls
// herself. The community lists spelt it AmaCethe, so the register had both.
// Folds AmaCethe into AmaCete (members, surname groups, names and praise
// names move across; AmaCethe is kept as a recognised spelling), then links
// members to their clan again. Runs once.
import prisma from '../config/db.js';
import { clearClanIndexCache, matchClan } from '../services/clanMatchService.js';
import { mergeInto } from './merge-clan-forms-nov-2026.js';

export const FIX_NAME = 'clan-cete-merge-2026-11-23';

export async function mergeCete({ from: fromName = 'AmaCethe', to: toName = 'AmaCete' } = {}) {
  if (await prisma.dataFix.findUnique({ where: { name: FIX_NAME } })) return { merged: false, linked: 0, skipped: true };
  let merged = false;
  await prisma.$transaction(async (tx) => {
    const from = await tx.clanGroup.findUnique({ where: { clanName: fromName } });
    if (!from) return;
    const to = await tx.clanGroup.findUnique({ where: { clanName: toName } });
    if (to) {
      await mergeInto(tx, from, to);
    } else {
      // Only the old spelling exists: give the clan its own name.
      await tx.clanGroup.update({ where: { id: from.id }, data: { clanName: toName } });
      await tx.clanAlias.upsert({ where: { aliasForm: fromName }, update: { clanGroupId: from.id }, create: { aliasForm: fromName, clanGroupId: from.id } });
    }
    merged = true;
  }, { timeout: 60_000 });
  clearClanIndexCache();

  let linked = 0;
  const users = await prisma.user.findMany({ where: { paternalIziduko: { not: null }, clanGroupId: null }, select: { id: true, paternalIziduko: true } });
  for (const user of users) {
    const match = await matchClan(user.paternalIziduko);
    if (match.autoSelect) {
      await prisma.user.update({ where: { id: user.id }, data: { clanGroupId: match.results[0].id } });
      linked += 1;
    }
  }
  await prisma.dataFix.create({ data: { name: FIX_NAME } });
  if (merged) console.log(`Clan Cete: ${fromName} folded into ${toName}; ${linked} member(s) linked.`);
  return { merged, linked, skipped: false };
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  mergeCete()
    .then((r) => console.log('Done.', r))
    .catch((err) => { console.error(err); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
}
