// Courtesy drinks priced right (founder, 23 Nov 2026: "the brandy price is
// R355, which is too high, should be around R180"). R355 was a bottle of gin
// and a bottle of brandy together, then counted twice. Existing plans are
// corrected once, only on lines nobody has paid and still at the old guide
// price, so a family's own figure is never rewritten.
import prisma from '../config/db.js';
import { COST_RATES_FOR_SCRIPTS } from '../controllers/ceremonyCostProfiles.js';

export const FIX_NAME = 'courtesy-drinks-2026-11-23';
const OLD_PAIR = 355;
const OLD_BRANDY = 195;
const AMAGQIRHA = 'Courtesy gin, brandy and matches for the elder amagqirha';

export async function fixCourtesyDrinks() {
  if (await prisma.dataFix.findUnique({ where: { name: FIX_NAME } })) return { pairs: 0, brandy: 0, amagqirha: 0, skipped: true };
  const { alcohol, supplies } = COST_RATES_FOR_SCRIPTS;
  const pair = alcohol.brandy_750ml + alcohol.gin_750ml;
  const unpaid = { category: 'alcohol', isPurchased: false };
  const amagqirha = await prisma.ceremonyCostItem.updateMany({
    where: { ...unpaid, label: AMAGQIRHA, unitCost: OLD_PAIR },
    data: { unit: 'set', unitCost: pair + supplies.matches_box, quantity: 1, suggestedAmount: '1 gin + 1 brandy + matches' },
  });
  const pairs = await prisma.ceremonyCostItem.updateMany({
    where: { ...unpaid, unitCost: OLD_PAIR, unit: 'bottle', label: { not: AMAGQIRHA } },
    data: { unit: 'pair', unitCost: pair },
  });
  const brandy = await prisma.ceremonyCostItem.updateMany({
    where: { ...unpaid, unitCost: OLD_BRANDY, unit: 'bottle', label: { contains: 'brandy', mode: 'insensitive' } },
    data: { unitCost: alcohol.brandy_750ml },
  });
  const brandyBottle = await prisma.ceremonyCostItem.updateMany({
    where: { ...unpaid, unitCost: OLD_BRANDY, unit: 'bottle', label: { startsWith: 'Courtesy: ' } },
    data: { unitCost: alcohol.brandy_750ml },
  });
  await prisma.dataFix.create({ data: { name: FIX_NAME } });
  const r = { pairs: pairs.count, brandy: brandy.count + brandyBottle.count, amagqirha: amagqirha.count, skipped: false };
  if (r.pairs + r.brandy + r.amagqirha) console.log(`Courtesy drinks: ${r.amagqirha} amagqirha set(s), ${r.pairs} gin-and-brandy pair line(s), ${r.brandy} brandy line(s) repriced.`);
  return r;
}
