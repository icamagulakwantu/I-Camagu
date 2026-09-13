// Adds the Monin cocktail syrup range as real, orderable-once-priced Sku
// rows. Confirmed via web research (a South African Monin distributor's own
// product catalogue, shop.captains.co.za) as flavours genuinely sold — not
// an invented list. casePriceZAR is null: no real Makro/Food Lover's/
// distributor price exists yet, same rule as every other new catalogue
// addition this round.
//
// Idempotent — upsertSkuByNameAndBottleFormat never touches a row that
// already exists.
import prisma from '../config/db.js';
import { upsertSkuByNameAndBottleFormat } from '../utils/upsertSku.js';

const MONIN_SYRUPS = [
  'Monin Agave',
  'Monin Almond Orgeat',
  'Monin Blue Curaçao Syrup',
  'Monin Chocolate',
  'Monin Crème Brûlée',
  'Monin Falernum',
  'Monin Green Apple',
  'Monin Kiwi Syrup',
  'Monin Lemon Pie / Tarte Citron',
  'Monin Lemon Tea / Citron',
  'Monin Melon',
  'Monin Popcorn',
  'Monin White Chocolate',
  // Confirmed present on the distributor's own site, but flagged there as
  // not currently in its first-page SA assortment — keep, but check with
  // the founder if it turns out not to be genuinely orderable locally.
  'Monin Spicy Mango',
];

export async function backfillMoninSyrups() {
  let created = 0;
  for (const name of MONIN_SYRUPS) {
    const before = await prisma.sku.findFirst({ where: { name, bottleFormat: '700ml Bottle' } });
    await upsertSkuByNameAndBottleFormat(
      prisma,
      // productType 'ALCOHOL' matches every other MIXER row (Angostura,
      // the cordials) — a bar mixer, not a standalone drink.
      { name, category: 'MIXER', productType: 'ALCOHOL', bottleFormat: '700ml Bottle', unitsPerCase: 12, casePriceZAR: null },
      {}
    );
    if (!before) created++;
  }
  if (created > 0) console.log(`Monin syrup backfill: ${created} new row(s) created.`);
  return created;
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  backfillMoninSyrups()
    .then((count) => console.log(`Done. ${count} row(s) created.`))
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
