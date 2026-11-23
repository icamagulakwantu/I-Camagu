// Brings saved plans in line with the founder's 23 Nov 2026 review, once.
//
// For every plan, past or not, so the wording is the same everywhere:
// - "The 14-group hierarchy" step becomes the seating step (each group in
//   its own place); its R0 price line goes where nothing was paid on it.
// - Ukunxityiswa spelt one way, so the step and its price line are one row.
// - The intambo slaughter step reads plainly.
// - Brewing and the elders' drinks move to the preparation stage of
//   Intambo Enkulu and Inkobe (they are made ready before the day), with the
//   price line named as the step. Ukukhapha is not a celebration (its own
//   rule: no fermented drink), so its umqombothi line goes where it was not
//   bought, and the elders' courtesy is worded as the family's choice.
// - Ukubuyisa's seating step is the common seating step; its price line is
//   the grass mats it always priced.
//
// For plans still to come: the new steps (the goat at home and ubulunga for
// ulwaluko; seating, ukuyala and izipho for umgidi; seating for the other
// isiko ceremonies), each added only where the plan does not have it.
import prisma from '../config/db.js';
import {
  HIERARCHY_RENAME, KHAPHA_COURTESY, NXITYISWA_RENAME, SEATING_ALL, SEND_OFF_ITEMS, UMGIDI_EXTRA_ITEMS,
} from '../controllers/ceremonyCostProfiles.js';

export const FIX_NAME = 'ceremony-order-2026-11-23';

const THROAT = ['Perform Ukuxhela: ritual throat-slitting of the goat by the lineage head at dawn', 'Ukuxhela: the lineage head slaughters the goat at dawn'];
const BUYISA_SEATING = 'Prepare designated seating in the kraal (Ebuhlanti) by family hierarchy';
const BUYISA_MATS = 'Grass mats (ikhukho) for the elders ebuhlanti';
const BRANDY_COST = 'Brandy and gin for elders and participants';
const BRANDY_STEP = 'Provide brandy and gin for elders and participants';

// [ceremony types, stage the drinks move to, old price-line name, step name]
const BREWING = [
  [['INTAMBO_ENKULU'], 'SUPPLIES_SACRED', 'Brew Umqombothi (50L to 75L) for the binding ceremony', 'Brew Umqombothi for the binding ceremony'],
  [['INKOBE_ZIKA_MAMA'], 'INKOBE_PREP', 'Brew Umqombothi (50L to 75L) for the ceremony', 'Brew Umqombothi for the ceremony'],
];

// Seating step, and the stage it belongs to, for the other isiko ceremonies.
const SEATING_STAGE = {
  INTAMBO_ENKULU: 'PLANNING_ELDERS',
  UKUKHAPHA: 'KRAAL_SACRIFICE',
  INKOBE_ZIKA_MAMA: 'INKOBE_PREP',
  UKUBUYISA: 'KRAAL_WELCOME',
  IMBELEKO: 'PLANNING',
};

const untouchedCost = { isPurchased: false };
const DAY = 86400000;

async function relabel(from, to, where = {}) {
  let n = 0;
  n += (await prisma.ceremonyChecklistItem.updateMany({ where: { label: from, ...where }, data: { label: to } })).count;
  n += (await prisma.ceremonyCostItem.updateMany({ where: { label: from, ...where }, data: { label: to } })).count;
  return n;
}

function stillToCome(ceremony, now) {
  const last = ceremony.type === 'ULWALUKO'
    ? (ceremony.homecomingDate || (ceremony.eventDate ? new Date(new Date(ceremony.eventDate).getTime() + 28 * DAY) : null))
    : ceremony.eventDate;
  return !last || new Date(last).getTime() >= now.getTime() - DAY;
}

export async function alignCeremonyOrder({ now = new Date() } = {}) {
  if (await prisma.dataFix.findUnique({ where: { name: FIX_NAME } })) return { renamed: 0, moved: 0, removed: 0, added: 0, skipped: true };
  let renamed = 0;
  let moved = 0;
  let removed = 0;
  let added = 0;

  // The old hierarchy step: its R0 price line goes where nothing was paid.
  removed += (await prisma.ceremonyCostItem.deleteMany({ where: { label: HIERARCHY_RENAME[0], unitCost: 0, ...untouchedCost } })).count;
  renamed += await relabel(...HIERARCHY_RENAME);
  renamed += (await prisma.checklistItem.updateMany({ where: { label: HIERARCHY_RENAME[0] }, data: { label: HIERARCHY_RENAME[1] } })).count;
  renamed += (await prisma.ceremonyChecklistItem.updateMany({ where: { label: NXITYISWA_RENAME[0] }, data: { label: NXITYISWA_RENAME[1] } })).count;
  renamed += await relabel(...THROAT);
  renamed += (await prisma.ceremonyChecklistItem.updateMany({ where: { label: BUYISA_SEATING }, data: { label: SEATING_ALL } })).count;
  renamed += (await prisma.ceremonyCostItem.updateMany({ where: { label: BUYISA_SEATING }, data: { label: BUYISA_MATS } })).count;

  for (const [types, phase, oldCost, step] of BREWING) {
    const ceremony = { type: { in: types } };
    renamed += (await prisma.ceremonyCostItem.updateMany({ where: { ceremony, label: oldCost }, data: { label: step } })).count;
    renamed += (await prisma.ceremonyCostItem.updateMany({ where: { ceremony, label: BRANDY_COST }, data: { label: BRANDY_STEP } })).count;
    for (const label of [step, BRANDY_STEP]) {
      moved += (await prisma.ceremonyChecklistItem.updateMany({ where: { ceremony, label }, data: { phase } })).count;
      moved += (await prisma.ceremonyCostItem.updateMany({ where: { ceremony, label }, data: { phase } })).count;
    }
  }

  // Ukukhapha: no umqombothi where it was not already bought or ticked.
  const khapha = { type: 'UKUKHAPHA' };
  removed += (await prisma.ceremonyCostItem.deleteMany({ where: { ceremony: khapha, label: { startsWith: 'Brew Umqombothi' }, ...untouchedCost } })).count;
  removed += (await prisma.ceremonyChecklistItem.deleteMany({ where: { ceremony: khapha, label: { startsWith: 'Brew Umqombothi' }, isCompleted: false, actualCostZAR: null } })).count;
  for (const from of [BRANDY_COST, BRANDY_STEP]) {
    renamed += (await prisma.ceremonyCostItem.updateMany({ where: { ceremony: khapha, label: from }, data: { label: KHAPHA_COURTESY } })).count;
    renamed += (await prisma.ceremonyChecklistItem.updateMany({ where: { ceremony: khapha, label: from }, data: { label: KHAPHA_COURTESY } })).count;
  }

  // New steps for plans still to come.
  const ceremonies = await prisma.ceremony.findMany({
    where: { type: { in: ['ULWALUKO', 'UMGIDI', 'IMIGIDI', ...Object.keys(SEATING_STAGE)] } },
    select: { id: true, type: true, eventDate: true, homecomingDate: true, checklistItems: { select: { label: true, phase: true } } },
  });
  for (const ceremony of ceremonies) {
    if (!stillToCome(ceremony, now)) continue;
    const have = new Set(ceremony.checklistItems.map((i) => i.label));
    let wanted = [];
    if (ceremony.type === 'ULWALUKO') {
      // Umgidi steps only where umgidi is planned in this plan.
      const plansUmgidi = ceremony.checklistItems.some((i) => i.phase === 'HIERARCHY_ALLOCATION' || i.phase === 'KRAAL_SEATING');
      wanted = [...SEND_OFF_ITEMS, ...(plansUmgidi ? UMGIDI_EXTRA_ITEMS : [])];
    } else if (ceremony.type === 'UMGIDI' || ceremony.type === 'IMIGIDI') {
      wanted = UMGIDI_EXTRA_ITEMS;
    } else {
      wanted = [{ phase: SEATING_STAGE[ceremony.type], label: SEATING_ALL }];
    }
    const missing = wanted.filter((i) => !have.has(i.label));
    if (missing.length) {
      added += (await prisma.ceremonyChecklistItem.createMany({
        data: missing.map((i) => ({ ceremonyId: ceremony.id, phase: i.phase, label: i.label, isCompleted: false })),
      })).count;
    }
  }

  await prisma.dataFix.create({ data: { name: FIX_NAME } });
  console.log(`Ceremony order: ${renamed} renamed, ${moved} moved to their stage, ${removed} removed, ${added} new step(s) added.`);
  return { renamed, moved, removed, added, skipped: false };
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  alignCeremonyOrder()
    .then((r) => console.log('Done.', r))
    .catch((err) => { console.error(err); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
}
