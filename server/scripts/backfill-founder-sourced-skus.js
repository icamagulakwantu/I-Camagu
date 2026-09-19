// New Sku rows for products the founder sent a real photo of that weren't
// in the catalogue at all yet. Per standing instruction: when a genuine
// product photo arrives for something we don't carry, add it to the
// catalogue automatically rather than asking each time — as long as it's a
// real, identifiable product in line with the rest of the alcohol range.
// casePriceZAR stays null — no real iCamagu case cost exists yet, same
// discipline as every other catalogue addition; catalogued but not yet
// orderable until a real bulk price is set.
//
// Idempotent — upsertSkuByNameAndBottleFormat never touches a row that
// already exists.
import prisma from '../config/db.js';
import { upsertSkuByNameAndBottleFormat } from '../utils/upsertSku.js';

const NEW_SKUS = [
  { name: 'Southern Comfort', category: 'LIQUEUR', bottleFormat: '750ml Bottle', unitsPerCase: 12 },
  { name: 'Captain Morgan Spiced Gold', category: 'RUM', bottleFormat: '750ml Bottle', unitsPerCase: 12 },
  { name: 'Klipdrift Premium', category: 'BRANDY', bottleFormat: '750ml Bottle', unitsPerCase: 12 },
  // New pack format, not just a new brand — the founder sent a can photo for
  // each of these three Breezer flavours, but only a Dumpy (275ml) row
  // existed for any of them (see split-bundled-flavour-skus.js, which
  // created the Dumpy rows for these same three names). unitsPerCase: 24
  // matches every other CIDER_RTD Can (500ml) in the catalogue.
  { name: 'Breezer Blueberry', category: 'CIDER_RTD', bottleFormat: 'Can (500ml)', unitsPerCase: 24 },
  { name: 'Breezer Watermelon', category: 'CIDER_RTD', bottleFormat: 'Can (500ml)', unitsPerCase: 24 },
  { name: 'Breezer Blackberry', category: 'CIDER_RTD', bottleFormat: 'Can (500ml)', unitsPerCase: 24 },
];

export async function backfillFounderSourcedSkus() {
  let created = 0;
  for (const { name, category, bottleFormat, unitsPerCase } of NEW_SKUS) {
    const before = await prisma.sku.findFirst({ where: { name, bottleFormat } });
    await upsertSkuByNameAndBottleFormat(
      prisma,
      {
        name,
        category,
        productType: 'ALCOHOL',
        bottleFormat,
        unitsPerCase,
        casePriceZAR: null,
      },
      {}
    );
    if (!before) created++;
  }
  if (created > 0) console.log(`Founder-sourced SKU backfill: ${created} new row(s) created.`);
  return created;
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  backfillFounderSourcedSkus()
    .then((count) => console.log(`Done. ${count} row(s) created.`))
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
