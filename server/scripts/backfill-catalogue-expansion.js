// One-off backfill: creates the catalogue-expansion SKUs (see prisma/seed.js,
// same block) directly against production, since seed.js is not run
// automatically on deploy. These are general Store SKUs, not tied to any
// ceremony checklist — real non-alcoholic beverages, real meat cuts,
// general livestock, ceremony vegetables/sides, and dry goods, for
// households and pools that aren't buying alcohol.
// Upsert on [name, bottleFormat] — safe to re-run.
import prisma from '../config/db.js';
import { upsertSkuByNameAndBottleFormat } from '../utils/upsertSku.js';

const CATALOGUE_EXPANSION_SKUS = [
  { name: 'Coca-Cola 300ml Can', category: 'SOFT_DRINKS', productType: 'BEVERAGE', bottleFormat: 'Can (300ml)', unitsPerCase: 24, casePriceZAR: 143.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Coca-Cola Beverages SA', retailPriceZAR: 359.76 },
  { name: 'Sprite 300ml Can', category: 'SOFT_DRINKS', productType: 'BEVERAGE', bottleFormat: 'Can (300ml)', unitsPerCase: 24, casePriceZAR: 143.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Coca-Cola Beverages SA', retailPriceZAR: 359.76 },
  { name: 'Fanta Orange 300ml Can', category: 'SOFT_DRINKS', productType: 'BEVERAGE', bottleFormat: 'Can (300ml)', unitsPerCase: 24, casePriceZAR: 143.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Coca-Cola Beverages SA', retailPriceZAR: 359.76 },
  { name: 'Stoney Ginger Beer 300ml Can', category: 'SOFT_DRINKS', productType: 'BEVERAGE', bottleFormat: 'Can (300ml)', unitsPerCase: 24, casePriceZAR: 143.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Coca-Cola Beverages SA', retailPriceZAR: 359.76 },
  { name: 'Valpre Still Water 500ml', category: 'WATER', productType: 'BEVERAGE', bottleFormat: 'Bottle (500ml)', unitsPerCase: 24, casePriceZAR: 246.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Coca-Cola Beverages SA', retailPriceZAR: 383.76 },
  { name: 'Beef Mince 5kg', category: 'MEAT', productType: 'FOOD', bottleFormat: null, unitsPerCase: 1, casePriceZAR: 574.95, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Butcher', retailPriceZAR: 699.95 },
  { name: 'Whole Chicken (~1.8kg)', category: 'MEAT', productType: 'FOOD', bottleFormat: null, unitsPerCase: 1, casePriceZAR: 99.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Butcher', retailPriceZAR: 116.98 },
  { name: 'Boerewors 5kg', category: 'MEAT', productType: 'FOOD', bottleFormat: null, unitsPerCase: 1, casePriceZAR: 474.95, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Butcher', retailPriceZAR: 554.95 },
  { name: 'Goat (Standard)', category: 'LIVESTOCK_ANIMAL', productType: 'LIVESTOCK', bottleFormat: null, unitsPerCase: 1, casePriceZAR: 2200.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Livestock Farmer' },
  { name: 'Cow / Ox (Inkunzi)', category: 'LIVESTOCK_ANIMAL', productType: 'LIVESTOCK', bottleFormat: null, unitsPerCase: 1, casePriceZAR: 22000.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Livestock Farmer' },
  { name: 'Onions 10kg', category: 'FRESH_PRODUCE', productType: 'FOOD', bottleFormat: null, unitsPerCase: 1, casePriceZAR: 95.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Fresh Produce' },
  { name: 'Carrots 10kg', category: 'FRESH_PRODUCE', productType: 'FOOD', bottleFormat: null, unitsPerCase: 1, casePriceZAR: 95.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Fresh Produce' },
  { name: 'Green Peppers (per kg)', category: 'FRESH_PRODUCE', productType: 'FOOD', bottleFormat: null, unitsPerCase: 1, casePriceZAR: 32.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Fresh Produce' },
  { name: 'Red Peppers (per kg)', category: 'FRESH_PRODUCE', productType: 'FOOD', bottleFormat: null, unitsPerCase: 1, casePriceZAR: 48.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Fresh Produce' },
  { name: 'Baked Beans 410g Tin', category: 'CANNED_GOODS', productType: 'FOOD', bottleFormat: null, unitsPerCase: 1, casePriceZAR: 15.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Grocery' },
  { name: 'Instant Coffee 750g', category: 'DRY_GOODS', productType: 'FOOD', bottleFormat: null, unitsPerCase: 1, casePriceZAR: 165.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Grocery' },
  { name: 'Tea 100 Bags', category: 'DRY_GOODS', productType: 'FOOD', bottleFormat: null, unitsPerCase: 1, casePriceZAR: 60.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Grocery' },
  { name: 'Peanut Butter 400g', category: 'DRY_GOODS', productType: 'FOOD', bottleFormat: null, unitsPerCase: 1, casePriceZAR: 50.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Grocery' },
  { name: 'Brown Bread Loaf', category: 'DRY_GOODS', productType: 'FOOD', bottleFormat: null, unitsPerCase: 1, casePriceZAR: 20.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Grocery' },
  { name: 'Milk 2L', category: 'DRY_GOODS', productType: 'FOOD', bottleFormat: null, unitsPerCase: 1, casePriceZAR: 35.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Grocery' },
  { name: 'Flour 2.5kg', category: 'DRY_GOODS', productType: 'FOOD', bottleFormat: null, unitsPerCase: 1, casePriceZAR: 40.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Grocery' },
];

export async function backfillCatalogueExpansion() {
  let upserted = 0;
  for (const sku of CATALOGUE_EXPANSION_SKUS) {
    await upsertSkuByNameAndBottleFormat(prisma, sku, {
      casePriceZAR: sku.casePriceZAR,
      retailPriceZAR: sku.retailPriceZAR ?? null,
    });
    upserted += 1;
  }
  if (upserted > 0) {
    console.log(`Catalogue expansion SKU backfill: ${upserted} row(s) upserted.`);
  }
  return upserted;
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  backfillCatalogueExpansion()
    .then((count) => console.log(`Done. ${count} row(s) upserted.`))
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
