// Corrects the ulwaluko diet lines in existing plans, as the founder
// described them on 17 Nov 2026: for the first seven days the initiate eats
// no salt and little water (green apples and other low-water fruit), as the
// ikhankatha guides; uMojiso comes after day 7 (named only, no detail). The
// old line wrongly suggested spinach and cabbage, which are watery. No
// medical detail is given anywhere (founder, 23 Nov 2026): an earlier
// wording of the first line that gave one is replaced too.
//
// Idempotent and narrow: only rows that still hold the exact old wording are
// changed, ticks are kept, and the uMojiso line is added once per checklist.
import prisma from '../config/db.js';

// The old text, only so stored rows can be found and replaced.
const EARLIER_FIRST_LINE = 'Days 1-7: food with no salt and little water, so the wound dries and heals';
const RELABEL = [
  ['No-salt food, steamed bread, spinach/cabbage', 'Days 1-7: food with no salt and little water, as the ikhankatha guides'],
  // The 17 Nov wording, which named the medical reason.
  [EARLIER_FIRST_LINE, 'Days 1-7: food with no salt and little water, as the ikhankatha guides'],
  ['Green apples and low-water-content fruit', 'Days 1-7: green apples and other low-water fruit'],
  // Ulwaluko is sacred: the founder asked for uMojiso to be named only,
  // without detail (18 Nov 2026). Shortens the line this script first added.
  ['After day 7: uMojiso, when he may eat salt and some watery food again (if he has cared for himself well)', 'After day 7: uMojiso'],
];
export const UMOJISO_LINE = 'After day 7: uMojiso';
const NEW_FIRST_LINE = RELABEL[0][1];

export async function fixUlwalukoDietWording() {
  let changed = 0;
  for (const [from, to] of RELABEL) {
    changed += (await prisma.ceremonyChecklistItem.updateMany({ where: { label: from }, data: { label: to } })).count;
    changed += (await prisma.checklistItem.updateMany({ where: { label: from }, data: { label: to } })).count;
    changed += (await prisma.ceremonyCostItem.updateMany({ where: { label: from }, data: { label: to } })).count;
  }

  // Add the uMojiso line beside every corrected diet list that lacks it.
  const ceremonies = await prisma.ceremonyChecklistItem.findMany({ where: { label: NEW_FIRST_LINE }, select: { ceremonyId: true } });
  for (const { ceremonyId } of ceremonies) {
    const has = await prisma.ceremonyChecklistItem.count({ where: { ceremonyId, label: UMOJISO_LINE } });
    if (!has) {
      await prisma.ceremonyChecklistItem.create({ data: { ceremonyId, phase: 'UMOJISO', label: UMOJISO_LINE } });
      changed += 1;
    }
  }
  const plans = await prisma.checklistItem.findMany({ where: { label: NEW_FIRST_LINE }, select: { planId: true } });
  for (const { planId } of plans) {
    const has = await prisma.checklistItem.count({ where: { planId, label: UMOJISO_LINE } });
    if (!has) {
      await prisma.checklistItem.create({ data: { planId, phase: 'UMOJISO', label: UMOJISO_LINE } });
      changed += 1;
    }
  }
  if (changed) console.log(`Ulwaluko diet wording: ${changed} checklist change(s).`);
  return changed;
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  fixUlwalukoDietWording()
    .then((n) => console.log(`Done. ${n} change(s).`))
    .catch((err) => { console.error(err); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
}
