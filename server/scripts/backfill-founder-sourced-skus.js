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
  { name: 'Southern Comfort', category: 'LIQUEUR', bottleFormat: '750ml Bottle' },
  { name: 'Captain Morgan Spiced Gold', category: 'RUM', bottleFormat: '750ml Bottle' },
  { name: 'Klipdrift Premium', category: 'BRANDY', bottleFormat: '750ml Bottle' },
];

export async function backfillFounderSourcedSkus() {
  let created = 0;
  for (const { name, category, bottleFormat } of NEW_SKUS) {
    const before = await prisma.sku.findFirst({ where: { name, bottleFormat } });
    await upsertSkuByNameAndBottleFormat(
      prisma,
      {
        name,
        category,
        productType: 'ALCOHOL',
        bottleFormat,
        unitsPerCase: 12,
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
