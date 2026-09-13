// One-off backfill: creates the catalogue-expansion SKUs (see prisma/seed.js,
// same block) directly against production, since seed.js is not run
// automatically on deploy. These are general Store SKUs, not tied to any
// ceremony checklist — real non-alcoholic beverages, real meat cuts,
// general livestock, ceremony vegetables/sides, and dry goods, for
// households and pools that aren't buying alcohol — plus any ceremony-staple
// alcohol added after the original seed.
// Upsert on [name, bottleFormat] — safe to re-run.
import prisma from '../config/db.js';
import { upsertSkuByNameAndBottleFormat } from '../utils/upsertSku.js';

const CATALOGUE_EXPANSION_SKUS = [
  // Commando is the brandy most likely to appear at a Xhosa ceremony, and it
  // was missing from the catalogue entirely. Prices below are the real
  // figures found published in September 2026 — Ultra Liquors listed the
  // 12 x 750ml case at R2 349.00, and Checkers/Shoprite the single bottle at
  // R229.99 (x12 = R2 759.88 for the retail comparable).
  //
  // TREAT THE CASE PRICE AS A PLACEHOLDER. It is an outlet's published case
  // price, not a negotiated trade price, so buying at it leaves no margin —
  // exactly the problem flagged in the pricing review. Replace it with a real
  // quote once the Gqeberha price sheet comes back.
  { name: 'Commando Brandy', category: 'BRANDY', productType: 'ALCOHOL', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 2349.00, palletPackQty: 60, palletPriceZAR: 135067.50, supplierPortfolio: 'Heineken (Distell)', retailPriceZAR: 2759.88 },
  { name: 'Beef Mince 5kg', category: 'MEAT', productType: 'FOOD', bottleFormat: null, unitsPerCase: 1, casePriceZAR: 574.95, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Butcher', retailPriceZAR: 699.95 },
  { name: 'Boerewors 5kg', category: 'MEAT', productType: 'FOOD', bottleFormat: null, unitsPerCase: 1, casePriceZAR: 474.95, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Butcher', retailPriceZAR: 554.95 },
  { name: 'Goat', category: 'LIVESTOCK_ANIMAL', productType: 'LIVESTOCK', bottleFormat: 'Inkabi (male)', unitsPerCase: 1, casePriceZAR: 2800.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Livestock Farmer' },
  { name: 'Goat', category: 'LIVESTOCK_ANIMAL', productType: 'LIVESTOCK', bottleFormat: 'Imazi (female)', unitsPerCase: 1, casePriceZAR: 2800.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Livestock Farmer' },
  { name: 'Inkomo / Cow', category: 'LIVESTOCK_ANIMAL', productType: 'LIVESTOCK', bottleFormat: 'Inkabi (male)', unitsPerCase: 1, casePriceZAR: 17000.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Livestock Farmer' },
  { name: 'Inkomo / Cow', category: 'LIVESTOCK_ANIMAL', productType: 'LIVESTOCK', bottleFormat: 'Imazi (female)', unitsPerCase: 1, casePriceZAR: 17000.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Livestock Farmer' },
  { name: 'Peanut Butter 400g', category: 'DRY_GOODS', productType: 'FOOD', bottleFormat: null, unitsPerCase: 1, casePriceZAR: 50.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Grocery' },
  { name: 'Brown Bread Loaf', category: 'DRY_GOODS', productType: 'FOOD', bottleFormat: null, unitsPerCase: 1, casePriceZAR: 20.00, palletPackQty: null, palletPriceZAR: null, supplierPortfolio: 'Local Grocery' },
  // Coca-Cola/Sprite/Fanta/Stoney, Valpre Still Water, Whole Chicken, Onions,
  // Carrots, Green/Red Peppers, Baked Beans, Instant Coffee, Tea, Milk and
  // Flour used to be listed here under their pre-bulk-rework names (e.g.
  // "Coca-Cola 300ml Can", "Onions 10kg"). Removed: matching by name, this
  // backfill treated the renamed rows as "missing" and silently recreated
  // 15 duplicate rows under the old names on every deploy since the rename.
  // backfill-grocery-bulk-catalog.js now owns creating/renaming all of these.
];

export async function backfillCatalogueExpansion() {
  let upserted = 0;
  for (const sku of CATALOGUE_EXPANSION_SKUS) {
    // A backfill fills gaps; it does not reset what the business has since
    // decided. Writing prices on every deploy already blanked eight shop
    // prices once and would have reset the livestock repricing too, so an
    // existing row is left untouched and only a missing one is created.
    const create = { ...sku };
    if (create.retailPriceZAR != null) create.retailPriceSource = 'VERIFIED';
    await upsertSkuByNameAndBottleFormat(prisma, create, {});
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
