// Belgravia Gin & Dark Cherry / Dry Lemon and Smirnoff Storm Citrus / Pine
// Twist are sold as 440 ml cans, not 500 ml (founder, 23 Nov 2026: "they
// should be like the shop sells"). The four rows take the shop's size and a
// shelf price read off the shops that day (PriceCheck and TinyFish search);
// where a shop sells the case of 24 for less, the bulk price drops to it.
// keepBulkBelowShelf then holds each at least 5% under the shelf. Runs once.
import prisma from '../config/db.js';

export const FIX_NAME = 'cans-440ml-2026-11-23';
const CHECKED_AT = new Date('2026-11-23T12:00:00Z');
const FROM = 'Can (500ml)';
const TO = 'Can (440ml)';

export const CANS = [
  { name: 'Belgravia Gin & Dark Cherry', retail: 719.76, source: 'Shoprite R29.99 a 440 ml can, x 24 (24 x 440 ml box R569.99), PriceCheck 23 Nov 2026' },
  { name: 'Belgravia Gin & Dry Lemon', retail: 719.76, source: 'Shoprite and Checkers R29.99 a 440 ml can, x 24, PriceCheck 23 Nov 2026', bulk: 459.0, bulkSource: 'Norman Goodfellows 24 x 440 ml R459' },
  { name: 'Smirnoff Storm Pine Twist', retail: 624.0, source: 'Pick n Pay R26.00 a 440 ml can, x 24 (24 x 440 ml R529.99 at Shoprite and Checkers), PriceCheck 23 Nov 2026' },
  { name: 'Smirnoff Storm Citrus', retail: 529.99, source: 'Checkers and Shoprite, Smirnoff Ice Storm 24 x 440 ml R529.99, 23 Nov 2026' },
];

export async function fixCanSizes(list = CANS, fixName = FIX_NAME) {
  if (await prisma.dataFix.findUnique({ where: { name: fixName } })) return { resized: 0, skipped: true };
  let resized = 0;
  for (const c of list) {
    const sku = await prisma.sku.findFirst({ where: { name: c.name, bottleFormat: FROM } });
    if (!sku) continue;
    // Never two rows for the same can: if a 440 ml row exists, leave both for review.
    if (await prisma.sku.findFirst({ where: { name: c.name, bottleFormat: TO } })) continue;
    const current = sku.casePriceZAR == null ? null : Number(sku.casePriceZAR);
    const data = { bottleFormat: TO, retailPriceZAR: c.retail, retailPriceSource: 'VERIFIED', retailPriceCheckedAt: CHECKED_AT, retailPriceNote: c.source };
    if (c.bulk != null && (current == null || c.bulk < current)) {
      data.casePriceZAR = c.bulk;
      data.retailPriceNote = `${c.source}. Bulk: ${c.bulkSource}.`;
    }
    await prisma.sku.update({ where: { id: sku.id }, data });
    resized += 1;
  }
  await prisma.dataFix.create({ data: { name: fixName } });
  if (resized) console.log(`Cans: ${resized} row(s) now 440 ml, as the shops sell them.`);
  return { resized, skipped: false };
}
