// White samp, not pap: in the Eastern Cape the ceremony starch is white
// samp (founder, 20 Nov 2026). Existing plans get their maize-meal line
// switched to white samp, once, but only where nothing was ticked or paid:
// a family's own record is never rewritten.
import prisma from '../config/db.js';
import { COST_RATES_FOR_SCRIPTS } from '../controllers/ceremonyCostProfiles.js';

export const FIX_NAME = 'samp-not-pap-2026-11-20';
const OLD_LABELS = ['Maize meal for pap', 'Maize meal'];
const SAMP = 'White samp';
const PER_GUEST_BAGS = 0.01; // ~100 g dry a guest, 10 kg bags

export async function switchPapToSamp() {
  if (await prisma.dataFix.findUnique({ where: { name: FIX_NAME } })) return { costs: 0, tasks: 0, skipped: true };
  const price = COST_RATES_FOR_SCRIPTS.food.samp_10kg;
  const costs = await prisma.ceremonyCostItem.findMany({
    where: { label: { in: OLD_LABELS }, unit: '50kg bag', isPurchased: false },
    select: { id: true, ceremony: { select: { guestCount: true } } },
  });
  for (const cost of costs) {
    const guests = cost.ceremony?.guestCount || 150;
    await prisma.ceremonyCostItem.update({
      where: { id: cost.id },
      data: { label: SAMP, unit: '10kg bag', unitCost: price, quantity: Math.max(1, Math.ceil(guests * PER_GUEST_BAGS)), suggestedAmount: '~100g dry a guest', skuId: null },
    });
  }
  const tasks = await prisma.ceremonyChecklistItem.updateMany({
    where: { label: { in: OLD_LABELS }, isCompleted: false, actualCostZAR: null },
    data: { label: SAMP },
  });
  await prisma.dataFix.create({ data: { name: FIX_NAME } });
  if (costs.length || tasks.count) console.log(`Samp: ${costs.length} shopping line(s) and ${tasks.count} checklist item(s) switched from pap.`);
  return { costs: costs.length, tasks: tasks.count, skipped: false };
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  switchPapToSamp()
    .then((r) => console.log('Done.', r))
    .catch((err) => { console.error(err); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
}
