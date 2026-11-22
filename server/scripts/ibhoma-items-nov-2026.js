// Adds the fuller ibhoma list (founder, 22 Nov 2026: nails and beer caps,
// binding wire, rope, plastic, the paraffin lamp and its paraffin or a solar
// lantern, buckets of water at the burning) to ulwaluko plans that have not
// started yet, with guide prices. The old "Matches, lamp/candles" line is
// split: where it is not yet ticked or paid it becomes "Matches and candles",
// and the lamp and paraffin get their own rows. Runs once.
import prisma from '../config/db.js';
import { CEREMONY_COST_PROFILES, IBHOMA_EXTRA_ITEMS, LAMP_RENAME } from '../controllers/ceremonyCostProfiles.js';

export const FIX_NAME = 'ibhoma-items-2026-11-22';
const LABELS = new Set(IBHOMA_EXTRA_ITEMS.map((i) => i.label));

function costRows(ceremonyId) {
  const rows = [];
  for (const [phase, items] of Object.entries(CEREMONY_COST_PROFILES.ULWALUKO)) {
    for (const item of items) {
      if (!LABELS.has(item.label) && item.label !== LAMP_RENAME[1]) continue;
      rows.push({
        ceremonyId, phase, label: item.label, category: item.category, unit: item.unit,
        unitCost: item.unitCost, quantity: item.quantity, isInputField: Boolean(item.isInputField),
        inputType: item.inputType || null, suggestedAmount: item.suggestedAmount || null,
      });
    }
  }
  return rows;
}

export async function addIbhomaItems({ now = new Date() } = {}) {
  if (await prisma.dataFix.findUnique({ where: { name: FIX_NAME } })) return { plans: 0, checklist: 0, costs: 0, renamed: 0, skipped: true };
  const [from, to] = LAMP_RENAME;
  const ceremonies = await prisma.ceremony.findMany({
    where: { type: 'ULWALUKO', OR: [{ eventDate: null }, { eventDate: { gt: now } }] },
    select: {
      id: true,
      checklistItems: { select: { id: true, label: true, isCompleted: true } },
      costItems: { select: { id: true, label: true, isPurchased: true } },
    },
  });
  let checklist = 0;
  let costs = 0;
  let renamed = 0;
  for (const c of ceremonies) {
    // Split the old combined line where nothing has been ticked or paid on it.
    const oldTask = c.checklistItems.find((i) => i.label === from && !i.isCompleted);
    const oldCost = c.costItems.find((i) => i.label === from && !i.isPurchased);
    const untouched = (oldTask || !c.checklistItems.some((i) => i.label === from)) && (oldCost || !c.costItems.some((i) => i.label === from));
    if (untouched) {
      if (oldTask) { await prisma.ceremonyChecklistItem.update({ where: { id: oldTask.id }, data: { label: to } }); renamed += 1 }
      if (oldCost) await prisma.ceremonyCostItem.delete({ where: { id: oldCost.id } });
    }
    const haveTask = new Set(c.checklistItems.map((i) => (i.id === oldTask?.id && untouched ? to : i.label)));
    const missing = IBHOMA_EXTRA_ITEMS.filter((i) => !haveTask.has(i.label));
    if (missing.length) {
      checklist += (await prisma.ceremonyChecklistItem.createMany({
        data: missing.map((i) => ({ ceremonyId: c.id, phase: i.phase, label: i.label, isCompleted: false })),
      })).count;
    }
    const haveCost = new Set(c.costItems.filter((i) => !(i.id === oldCost?.id && untouched)).map((i) => i.label));
    const newCosts = costRows(c.id).filter((r) => !haveCost.has(r.label) && (r.label !== to || untouched));
    if (newCosts.length) costs += (await prisma.ceremonyCostItem.createMany({ data: newCosts })).count;
  }
  await prisma.dataFix.create({ data: { name: FIX_NAME } });
  if (checklist || costs) console.log(`Ibhoma items: ${ceremonies.length} plan(s), ${checklist} steps and ${costs} priced items added, ${renamed} renamed.`);
  return { plans: ceremonies.length, checklist, costs, renamed, skipped: false };
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  addIbhomaItems()
    .then((r) => console.log('Done.', r))
    .catch((err) => { console.error(err); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
}
