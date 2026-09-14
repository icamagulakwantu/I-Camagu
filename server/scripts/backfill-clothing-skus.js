// One-off backfill: seeds the new Clothing department (src/data/storeTaxonomy.js)
// with its first real SKU, per the founder's request to add one and confirm
// it shows up. Sold per garment, not per case (see bulkUnits.js's new
// CLOTHING rule). No casePriceZAR yet — nobody has quoted a bulk supplier
// for this yet, so it's catalogued as "not yet orderable" like every other
// unpriced row, never an invented number.
//
// Idempotent via upsertSkuByNameAndBottleFormat — safe to re-run and safe on
// every boot.
import prisma from '../config/db.js';
import { upsertSkuByNameAndBottleFormat } from '../utils/upsertSku.js';

// A golf shirt is the real, common bulk/branded-apparel item for South
// African stokvel and ceremony events (imigidi t-shirts, umgidi golf
// shirts) — a genuinely useful first Clothing row rather than a filler one.
const NEW_SKUS = [
  { name: 'Golf Shirt', category: 'CLOTHING', productType: 'CLOTHING', bottleFormat: 'Plain, Sizes S-3XL', unitsPerCase: 1, casePriceZAR: null },
];

export async function backfillClothingSkus() {
  let created = 0;
  for (const item of NEW_SKUS) {
    const before = await prisma.sku.findFirst({ where: { name: item.name, bottleFormat: item.bottleFormat } });
    await upsertSkuByNameAndBottleFormat(prisma, item, {});
    if (!before) created++;
  }

  if (created > 0) console.log(`Clothing SKU backfill: ${created} new row(s) created.`);
  return { created };
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  backfillClothingSkus()
    .then((result) => console.log('Done.', result))
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
