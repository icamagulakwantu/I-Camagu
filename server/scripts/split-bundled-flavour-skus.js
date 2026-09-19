// Several Sku names bundle multiple flavours into one row with an "X/Y"
// name (Bernini Classic/Blush/Ruby, Brutal Fruit Ruby/Litchi, Breezer
// (Red/Watermelon), Belgravia G&T (Asstd)) — the same pattern still used
// correctly elsewhere for genuinely interchangeable variants (4th Street,
// Smirnoff Spin/Storm). The founder wants these specific ones treated as
// separate, independently priced/photographed products instead. Several of
// the bundled names also turned out to reference flavours that aren't real
// (Brutal Fruit doesn't ship "Litchi", Breezer's big bottle isn't "Red",
// Windhoek's already-fixed "Light" was the same class of error) — the real
// flavour names come from the founder's own product photos.
//
// Each bundled row is split into one row per flavour, copying its pricing,
// pack size and supplier data across, then the bundled row itself is
// removed.
//
// Idempotent — once a bundled row is gone (already split), it's skipped;
// re-running never duplicates the split rows.
import prisma from '../config/db.js';
import { upsertSkuByNameAndBottleFormat } from '../utils/upsertSku.js';

const SPLITS = [
  { bundledName: 'Bernini Classic/Blush/Ruby', flavours: ['Bernini Classic', 'Bernini Blush', 'Bernini Ruby'] },
  { bundledName: 'Brutal Fruit Ruby/Litchi', flavours: ['Brutal Fruit Ruby Apple', 'Brutal Fruit Strawberry Rouge'] },
  { bundledName: 'Breezer (Red/Watermelon)', flavours: ['Breezer Blueberry', 'Breezer Watermelon', 'Breezer Blackberry'] },
  { bundledName: 'Belgravia G&T (Asstd)', flavours: ['Belgravia Gin & Dark Cherry', 'Belgravia Gin & Dry Lemon'] },
];

export async function splitBundledFlavourSkus() {
  let created = 0;
  for (const { bundledName, flavours } of SPLITS) {
    const bundled = await prisma.sku.findMany({ where: { name: bundledName } });
    for (const row of bundled) {
      for (const name of flavours) {
        const before = await prisma.sku.findFirst({ where: { name, bottleFormat: row.bottleFormat } });
        await upsertSkuByNameAndBottleFormat(
          prisma,
          {
            name,
            category: row.category,
            productType: row.productType,
            bottleFormat: row.bottleFormat,
            unitsPerCase: row.unitsPerCase,
            casePriceZAR: row.casePriceZAR,
            retailPriceZAR: row.retailPriceZAR,
            retailPriceSource: row.retailPriceSource,
            retailPriceCheckedAt: row.retailPriceCheckedAt,
            retailPriceNote: row.retailPriceNote,
            palletPackQty: row.palletPackQty,
            palletPriceZAR: row.palletPriceZAR,
            supplierPortfolio: row.supplierPortfolio,
            bulkUnit: row.bulkUnit,
            bulkUnitPlural: row.bulkUnitPlural,
          },
          {}
        );
        if (!before) created++;
      }
      await prisma.sku.delete({ where: { id: row.id } });
    }
  }
  if (created > 0) console.log(`Bundled flavour split: ${created} new row(s) created.`);
  return created;
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  splitBundledFlavourSkus()
    .then((count) => console.log(`Done. ${count} row(s) created.`))
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
