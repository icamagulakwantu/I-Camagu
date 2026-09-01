// One-off backfill: creates the real, purchasable ceremony-provisioning
// SKUs (see prisma/seed.js, same block) directly against production,
// since seed.js is not run automatically on deploy. These are what
// CeremonyCostItem.skuId links to — without them, new Ulwaluko
// ceremonies would generate cost items with no linked SKU and no "Buy"
// action. Upsert on [name, bottleFormat] — safe to re-run.
import prisma from '../config/db.js';

const CEREMONY_SKUS = [
  { name: 'Ikoto (Bentonite Clay)', category: 'RITUAL_SUPPLIES', productType: 'SUPPLIES', bottleFormat: null, unitsPerCase: 1, casePriceZAR: 65.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Traditional Supplier' },
  { name: 'Imphepho Bundle', category: 'RITUAL_SUPPLIES', productType: 'SUPPLIES', bottleFormat: null, unitsPerCase: 1, casePriceZAR: 45.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Traditional Supplier' },
  { name: 'Plain Grey Blanket', category: 'ULWALUKO_SUPPLIES', productType: 'SUPPLIES', bottleFormat: null, unitsPerCase: 1, casePriceZAR: 280.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Retail' },
  { name: 'White Blanket with Black Stripes', category: 'ULWALUKO_SUPPLIES', productType: 'SUPPLIES', bottleFormat: null, unitsPerCase: 1, casePriceZAR: 350.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Retail' },
  { name: 'Tarpaulin Sail', category: 'ULWALUKO_SUPPLIES', productType: 'SUPPLIES', bottleFormat: null, unitsPerCase: 1, casePriceZAR: 280.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Hardware' },
  { name: 'Ibhoma Pole Bundle', category: 'ULWALUKO_SUPPLIES', productType: 'SUPPLIES', bottleFormat: null, unitsPerCase: 1, casePriceZAR: 350.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Hardware' },
  { name: '25L Water Container', category: 'ULWALUKO_SUPPLIES', productType: 'SUPPLIES', bottleFormat: null, unitsPerCase: 1, casePriceZAR: 180.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Retail' },
  { name: 'Green Apples (per kg)', category: 'FRESH_PRODUCE', productType: 'FOOD', bottleFormat: null, unitsPerCase: 1, casePriceZAR: 35.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Fresh Produce' },
  { name: 'Butter 500g', category: 'GROCERY', productType: 'FOOD', bottleFormat: null, unitsPerCase: 1, casePriceZAR: 85.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Grocery' },
  { name: 'Sheep with Horns', category: 'LIVESTOCK_ANIMAL', productType: 'LIVESTOCK', bottleFormat: null, unitsPerCase: 1, casePriceZAR: 2800.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Livestock Farmer' },
];

export async function backfillCeremonySkus() {
  let upserted = 0;
  for (const sku of CEREMONY_SKUS) {
    await prisma.sku.upsert({
      where: { name_bottleFormat: { name: sku.name, bottleFormat: sku.bottleFormat } },
      update: { casePriceZAR: sku.casePriceZAR },
      create: sku,
    });
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
