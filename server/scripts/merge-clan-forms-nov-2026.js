// One clan, one entry (founder, 23 Nov 2026): Tshawe is the ancestor,
// AmaTshawe the plural and MamTshawe what a woman of the clan calls herself;
// they are the same clan. The clan register had some of these forms saved as
// clans of their own (Tshawe beside AmaTshawe, Mamzangwa and Mzangwa beside
// AmaZangwa...). Because a name then matched two clans, nobody who typed it
// was linked to a clan at all.
//
// This folds each stray form into its clan: members, surname groups, other
// names, praise names and review records move across, and the form is kept as
// a recognised name of the clan. Two entries that are only a female form
// (Mamcete, Mamngqosile) are renamed to the clan itself, keeping the female
// form as a name. Then every member with a clan name is linked to their clan.
// Runs once.
import prisma from '../config/db.js';
import { clearClanIndexCache, matchClan, normaliseIsiduko } from '../services/clanMatchService.js';
import { syncUserClanGroups } from '../services/izidukoService.js';

export const FIX_NAME = 'clan-forms-merge-2026-11-23';

// [stray form, the clan it belongs to]
export const MERGES = [
  ['Tshawe', 'AmaTshawe'],
  ['Mamzangwa', 'AmaZangwa'],
  ['Mzangwa', 'AmaZangwa'],
  ['Mamsukwini', 'AmaSukwini'],
  ['Mamcwerha', 'Cwerha'],
  ['Mamqoma', 'AmaQoma'],
  ['Mamthunzi', 'AmaMthunzi'],
  ['MamNgwevu', 'AmaMngwevu'],
  ['Mankomo', 'AmaNkomo'],
  ['Mkhwemte', 'AmaKhwemte'],
  ['Qwathi', 'AmaMqwathi'],
];

// [female form saved as a clan, the clan's own name]
export const RENAMES = [
  ['Mamcete', 'AmaCete'],
  ['Mamngqosile', 'AmaNgqosile'],
];

async function namesOf(tx, groupId) {
  const group = await tx.clanGroup.findUnique({ where: { id: groupId }, include: { aliases: true } });
  return new Set([group.clanName, ...group.aliases.map((a) => a.aliasForm)].map(normaliseIsiduko));
}

// Keep `form` as a recognised name of the clan.
async function keepName(tx, groupId, form) {
  const group = await tx.clanGroup.findUnique({ where: { id: groupId } });
  if (group.clanName === form) return;
  await tx.clanAlias.upsert({ where: { aliasForm: form }, update: { clanGroupId: groupId }, create: { aliasForm: form, clanGroupId: groupId } });
}

// Folds one clan entry into another (exported for later merges).
export async function mergeInto(tx, from, to) {
  await tx.user.updateMany({ where: { clanGroupId: from.id }, data: { clanGroupId: to.id } });
  await tx.isidukoSubmission.updateMany({ where: { resolvedClanGroupId: from.id }, data: { resolvedClanGroupId: to.id } });

  const surnames = new Set((await tx.surnameSubgroup.findMany({ where: { clanGroupId: to.id } })).map((s) => s.surname));
  for (const sub of await tx.surnameSubgroup.findMany({ where: { clanGroupId: from.id } })) {
    if (surnames.has(sub.surname)) await tx.surnameSubgroup.delete({ where: { id: sub.id } });
    else await tx.surnameSubgroup.update({ where: { id: sub.id }, data: { clanGroupId: to.id } });
  }

  const praises = new Map((await tx.clanPraise.findMany({ where: { clanGroupId: to.id } })).map((p) => [p.praise, p]));
  for (const praise of await tx.clanPraise.findMany({ where: { clanGroupId: from.id } })) {
    const have = praises.get(praise.praise);
    if (have) {
      if (praise.sourceCount > have.sourceCount) await tx.clanPraise.update({ where: { id: have.id }, data: { sourceCount: praise.sourceCount } });
      await tx.clanPraise.delete({ where: { id: praise.id } });
    } else {
      await tx.clanPraise.update({ where: { id: praise.id }, data: { clanGroupId: to.id } });
    }
  }

  const known = await namesOf(tx, to.id);
  for (const alias of await tx.clanAlias.findMany({ where: { clanGroupId: from.id } })) {
    if (known.has(normaliseIsiduko(alias.aliasForm))) await tx.clanAlias.delete({ where: { id: alias.id } });
    else await tx.clanAlias.update({ where: { id: alias.id }, data: { clanGroupId: to.id } });
  }

  await tx.clanGroup.delete({ where: { id: from.id } });
  await keepName(tx, to.id, from.clanName);
}

export async function mergeClanForms({ merges = MERGES, renames = RENAMES } = {}) {
  if (await prisma.dataFix.findUnique({ where: { name: FIX_NAME } })) return { merged: 0, renamed: 0, linked: 0, skipped: true };
  let merged = 0;
  let renamed = 0;
  await prisma.$transaction(async (tx) => {
    for (const [form, clan] of merges) {
      const from = await tx.clanGroup.findUnique({ where: { clanName: form } });
      const to = await tx.clanGroup.findUnique({ where: { clanName: clan } });
      if (!from || !to || from.id === to.id) continue;
      await mergeInto(tx, from, to);
      merged += 1;
    }
    for (const [form, clan] of renames) {
      const group = await tx.clanGroup.findUnique({ where: { clanName: form } });
      if (!group || await tx.clanGroup.findUnique({ where: { clanName: clan } })) continue;
      await tx.clanGroup.update({ where: { id: group.id }, data: { clanName: clan } });
      await keepName(tx, group.id, form);
      renamed += 1;
    }
  }, { timeout: 60_000 });
  clearClanIndexCache();

  // Link every member to their clan now that each name matches one clan.
  let linked = 0;
  const users = await prisma.user.findMany({
    where: { paternalIziduko: { not: null } },
    select: { id: true, clanGroupId: true, lastName: true, paternalIziduko: true, maternalIziduko: true, paternalGrandmotherIziduko: true, maternalGrandmotherIziduko: true },
  });
  for (const user of users) {
    const match = await matchClan(user.paternalIziduko);
    const clanGroupId = match.autoSelect ? match.results[0].id : null;
    if (clanGroupId && clanGroupId !== user.clanGroupId) {
      await prisma.user.update({ where: { id: user.id }, data: { clanGroupId } });
      linked += 1;
    }
    await syncUserClanGroups(user);
  }

  await prisma.dataFix.create({ data: { name: FIX_NAME } });
  console.log(`Clan forms: ${merged} folded into their clan, ${renamed} renamed, ${linked} member(s) linked to their clan.`);
  return { merged, renamed, linked, skipped: false };
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  mergeClanForms()
    .then((r) => console.log('Done.', r))
    .catch((err) => { console.error(err); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
}
