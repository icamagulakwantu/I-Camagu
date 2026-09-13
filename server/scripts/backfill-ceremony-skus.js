// One-off backfill: creates the real, purchasable ceremony-provisioning
// SKUs (see prisma/seed.js, same block) directly against production,
// since seed.js is not run automatically on deploy. These are what
// CeremonyCostItem.skuId links to — without them, new Ulwaluko
// ceremonies would generate cost items with no linked SKU and no "Buy"
// action. Upsert on [name, bottleFormat] — safe to re-run.
import prisma from '../config/db.js';
import { upsertSkuByNameAndBottleFormat } from '../utils/upsertSku.js';

const CEREMONY_SKUS = [
  { name: 'Ikoto (Bentonite Clay)', category: 'RITUAL_SUPPLIES', productType: 'SUPPLIES', bottleFormat: null, unitsPerCase: 1, casePriceZAR: 65.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Traditional Supplier' },
  { name: 'Imphepho Bundle', category: 'RITUAL_SUPPLIES', productType: 'SUPPLIES', bottleFormat: null, unitsPerCase: 1, casePriceZAR: 45.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Traditional Supplier' },
  { name: 'Plain Grey Blanket', category: 'ULWALUKO_SUPPLIES', productType: 'SUPPLIES', bottleFormat: null, unitsPerCase: 1, casePriceZAR: 350.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Retail' },
  { name: 'White Blanket with Black Stripes', category: 'ULWALUKO_SUPPLIES', productType: 'SUPPLIES', bottleFormat: null, unitsPerCase: 1, casePriceZAR: 450.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Retail' },
  { name: 'Tarpaulin Sail', category: 'ULWALUKO_SUPPLIES', productType: 'SUPPLIES', bottleFormat: null, unitsPerCase: 1, casePriceZAR: 350.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Hardware' },
  { name: 'Ibhoma Pole Bundle', category: 'ULWALUKO_SUPPLIES', productType: 'SUPPLIES', bottleFormat: null, unitsPerCase: 1, casePriceZAR: 450.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Hardware' },
  { name: '25L Water Container', category: 'ULWALUKO_SUPPLIES', productType: 'SUPPLIES', bottleFormat: null, unitsPerCase: 1, casePriceZAR: 180.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Retail' },
  { name: 'Sheep', category: 'LIVESTOCK_ANIMAL', productType: 'LIVESTOCK', bottleFormat: 'Inkabi (male)', unitsPerCase: 1, casePriceZAR: 2700.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Livestock Farmer' },
  { name: 'Sheep', category: 'LIVESTOCK_ANIMAL', productType: 'LIVESTOCK', bottleFormat: 'Imazi (female)', unitsPerCase: 1, casePriceZAR: 2700.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Livestock Farmer' },
  { name: 'Sybok', category: 'LIVESTOCK_ANIMAL', productType: 'LIVESTOCK', bottleFormat: 'Inkabi (male)', unitsPerCase: 1, casePriceZAR: 2700.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Livestock Farmer' },
  { name: 'Sybok', category: 'LIVESTOCK_ANIMAL', productType: 'LIVESTOCK', bottleFormat: 'Imazi (female)', unitsPerCase: 1, casePriceZAR: 2700.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Livestock Farmer' },
  // Green Apples, Butter, Maize Meal, Potatoes, Cabbage, Spinach, Cooking
  // Oil and Sugar used to be listed here under their pre-bulk-rework names
  // (e.g. "Cabbage Head", "Maize Meal 50kg"). Removed: matching by name,
  // this backfill treated the renamed rows as "missing" and silently
  // recreated 8 duplicate rows under the old names on every deploy since
  // the rename. Existing CeremonyCostItem.skuId references are by id, not
  // name, so they still correctly point at the real (renamed) rows —
  // backfill-grocery-bulk-catalog.js now owns creating/renaming these.
];

export async function backfillCeremonySkus() {
  let upserted = 0;
  for (const sku of CEREMONY_SKUS) {
    // Create-only: an existing row keeps the price the business set.
    await upsertSkuByNameAndBottleFormat(prisma, sku, {});
    upserted += 1;
  }
  if (upserted > 0) {
    console.log(`Ceremony SKU backfill: ${upserted} row(s) upserted.`);
  }
  return upserted;
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  backfillCeremonySkus()
    .then((count) => console.log(`Done. ${count} row(s) upserted.`))
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
