// One-off backfill: rebuilds the grocery/produce/meat/beverage catalogue
// around real bulk buying units — boxes, sacks and bags — instead of the
// original single-consumer sizes it was seeded with (a 410g tin, a 2L milk,
// "per kg" peppers). Per the founder: stokvels, Imigidi and ceremonies buy
// in bulk, and bulk orders don't offer singles, so every SKU here needs to
// come in that sense. Bread and peanut butter are left untouched — the
// exception the founder named for things bought from a local vendor rather
// than a bulk wholesaler.
//
// Every renamed/resized row has its casePriceZAR cleared to null rather than
// carrying forward a price that was quoted for the old, wrong pack size —
// exactly the same discipline already applied to alcohol (never let a
// number silently misdescribe a different size). A null casePriceZAR now
// means "catalogued, not yet orderable" everywhere downstream (see
// skuVisibility.isOrderable) until a real Makro/Food Lover's price lands.
//
// Idempotent — safe to re-run and safe on every boot: renames match on the
// OLD (name, bottleFormat) pair and no-op once applied; new rows go through
// upsertSkuByNameAndBottleFormat, which never touches a row that already
// exists.
import prisma from '../config/db.js';
import { upsertSkuByNameAndBottleFormat } from '../utils/upsertSku.js';

// [oldName, oldBottleFormat, newFields] — newFields clears casePriceZAR
// whenever the actual quantity per orderable unit changes (a box now holding
// many of what used to be one, a can shrinking from 300ml to 250ml, etc.).
// Where the real weight/volume is unchanged and only the label moved from
// the name into bottleFormat (or gained a "Big Tin"/"Sack" description),
// casePriceZAR is left out of newFields entirely — the existing, already
// real price still correctly describes the same real product.
const RENAMES = [
  ['Baked Beans 410g Tin', null, { name: 'Baked Beans', bottleFormat: '3kg Tin', casePriceZAR: null }], // 410g -> 3kg
  ['Flour 2.5kg', null, { name: 'Flour', category: 'GROCERY_BULK', bottleFormat: '10kg Bag', casePriceZAR: null }], // 2.5kg -> 10kg; also moved out of DRY_GOODS to sit with the other bulk-bag staples
  ['Instant Coffee 750g', null, { name: 'Instant Coffee', bottleFormat: '750g Big Tin' }], // still 750g
  ['Milk 2L', null, { name: 'Milk Long Life', bottleFormat: '1L x 6-Pack', unitsPerCase: 6, casePriceZAR: null }], // 2L -> 6L
  ['Tea 100 Bags', null, { name: 'Tea', bottleFormat: '1kg Box', casePriceZAR: null }], // 100 bags (~200g) -> 1kg
  ['Cooking Oil 5L', null, { name: 'Cooking Oil', bottleFormat: '5L' }], // still 5L
  ['Sugar 10kg', null, { name: 'Sugar', bottleFormat: '10kg Bag' }], // still 10kg
  ['Butter 500g', null, { name: 'Butter', bottleFormat: '1kg', casePriceZAR: null }], // 500g -> 1kg
  ['Maize Meal 50kg', null, { name: 'Maize Meal', bottleFormat: '50kg Bag' }], // still 50kg
  ['Cabbage Head', null, { name: 'Cabbage', bottleFormat: 'Box (Bulk)', casePriceZAR: null }], // 1 head -> a box of heads
  ['Potatoes 10kg', null, { name: 'Potatoes', bottleFormat: '10kg Sack' }], // still 10kg
  ['Onions 10kg', null, { name: 'Onions', bottleFormat: '10kg Sack' }], // still 10kg
  ['Green Peppers (per kg)', null, { name: 'Green Peppers', bottleFormat: 'Box (Bulk)', casePriceZAR: null }], // per kg -> a box of many kg
  ['Red Peppers (per kg)', null, { name: 'Red Peppers', bottleFormat: 'Box (Bulk)', casePriceZAR: null }], // per kg -> a box of many kg
  ['Spinach Bundle', null, { name: 'Spinach', bottleFormat: 'Box (Bulk Bunches)', casePriceZAR: null }], // 1 bundle -> a box of bundles
  ['Green Apples (per kg)', null, { name: 'Green Apples', bottleFormat: 'Box (Bulk)', casePriceZAR: null }], // per kg -> a box of many kg
  ['Carrots 10kg', null, { name: 'Carrots', bottleFormat: '10kg Sack' }], // still 10kg
  // The 300ml->250ml resize also invalidates each one's VERIFIED retail
  // comparison (R359.76 was checked against a 300ml can) — cleared here too
  // rather than left describing a can size that no longer exists.
  ['Coca-Cola 300ml Can', 'Can (300ml)', { name: 'Coca-Cola', bottleFormat: 'Can (250ml)', casePriceZAR: null, retailPriceZAR: null, retailPriceSource: null, retailPriceCheckedAt: null, retailPriceNote: 'Cleared: was VERIFIED for the old 300ml can, no longer describes this 250ml SKU.' }],
  ['Fanta Orange 300ml Can', 'Can (300ml)', { name: 'Fanta Orange', bottleFormat: 'Can (250ml)', casePriceZAR: null, retailPriceZAR: null, retailPriceSource: null, retailPriceCheckedAt: null, retailPriceNote: 'Cleared: was VERIFIED for the old 300ml can, no longer describes this 250ml SKU.' }],
  ['Sprite 300ml Can', 'Can (300ml)', { name: 'Sprite', bottleFormat: 'Can (250ml)', casePriceZAR: null, retailPriceZAR: null, retailPriceSource: null, retailPriceCheckedAt: null, retailPriceNote: 'Cleared: was VERIFIED for the old 300ml can, no longer describes this 250ml SKU.' }],
  ['Stoney Ginger Beer 300ml Can', 'Can (300ml)', { name: 'Stoney Ginger Beer', bottleFormat: 'Can (250ml)', casePriceZAR: null, retailPriceZAR: null, retailPriceSource: null, retailPriceCheckedAt: null, retailPriceNote: 'Cleared: was VERIFIED for the old 300ml can, no longer describes this 250ml SKU.' }],
  ['Valpre Still Water 500ml', 'Bottle (500ml)', { name: 'Valpre Still Water', bottleFormat: 'Bottle (500ml)' }], // still 500ml, only the name text moved into bottleFormat — retail comparison still holds
  // The box-of-birds resize also invalidates the VERIFIED single-bird retail
  // comparison (R116.98 was checked against one bird).
  ['Whole Chicken (~1.8kg)', null, { name: 'Whole Chicken', bottleFormat: 'Box (Bulk, ~1.8kg each bird)', casePriceZAR: null, retailPriceZAR: null, retailPriceSource: null, retailPriceCheckedAt: null, retailPriceNote: 'Cleared: was VERIFIED for a single bird, no longer describes this box-of-birds SKU.' }],
];

// New products/pack-size variants — created only if missing. casePriceZAR
// is always null here: none of these have a real Makro/Food Lover's quote
// yet, so none get an invented one.
const NEW_SKUS = [
  // --- Canned goods: the founder's other named bulk option for beans ---
  { name: 'Baked Beans', category: 'CANNED_GOODS', productType: 'FOOD', bottleFormat: 'Pack of 24 x 410g Tins', unitsPerCase: 24, casePriceZAR: null },

  // --- Grocery bulk: staples that come in 10kg/12.5kg bags ---
  { name: 'Flour', category: 'GROCERY_BULK', productType: 'FOOD', bottleFormat: '12.5kg Bag', unitsPerCase: 1, casePriceZAR: null },
  { name: 'Samp', category: 'GROCERY_BULK', productType: 'FOOD', bottleFormat: '10kg Bag', unitsPerCase: 1, casePriceZAR: null },
  { name: 'Samp', category: 'GROCERY_BULK', productType: 'FOOD', bottleFormat: '12.5kg Bag', unitsPerCase: 1, casePriceZAR: null },
  { name: 'Maize Meal', category: 'GROCERY_BULK', productType: 'FOOD', bottleFormat: '10kg Bag', unitsPerCase: 1, casePriceZAR: null },
  { name: 'Maize Meal', category: 'GROCERY_BULK', productType: 'FOOD', bottleFormat: '12.5kg Bag', unitsPerCase: 1, casePriceZAR: null },
  { name: 'Amazimba', category: 'GROCERY_BULK', productType: 'FOOD', bottleFormat: '10kg Bag', unitsPerCase: 1, casePriceZAR: null },
  { name: 'Amazimba', category: 'GROCERY_BULK', productType: 'FOOD', bottleFormat: '12.5kg Bag', unitsPerCase: 1, casePriceZAR: null },
  { name: 'Umbona', category: 'GROCERY_BULK', productType: 'FOOD', bottleFormat: '10kg Bag', unitsPerCase: 1, casePriceZAR: null },
  { name: 'Umbona', category: 'GROCERY_BULK', productType: 'FOOD', bottleFormat: '12.5kg Bag', unitsPerCase: 1, casePriceZAR: null },
  { name: 'Sugar', category: 'GROCERY_BULK', productType: 'FOOD', bottleFormat: '12.5kg Bag', unitsPerCase: 1, casePriceZAR: null },
  { name: 'Rice', category: 'GROCERY_BULK', productType: 'FOOD', bottleFormat: '10kg Bag', unitsPerCase: 1, casePriceZAR: null },
  { name: 'Rice', category: 'GROCERY_BULK', productType: 'FOOD', bottleFormat: '12.5kg Bag', unitsPerCase: 1, casePriceZAR: null },
  { name: 'Mayonnaise', category: 'GROCERY_BULK', productType: 'FOOD', bottleFormat: '3kg Tub', unitsPerCase: 1, casePriceZAR: null },
  { name: 'Mayonnaise', category: 'GROCERY_BULK', productType: 'FOOD', bottleFormat: '5kg Tub', unitsPerCase: 1, casePriceZAR: null },
  { name: 'Chutney', category: 'GROCERY_BULK', productType: 'FOOD', bottleFormat: '3kg Tub', unitsPerCase: 1, casePriceZAR: null },
  { name: 'Chutney', category: 'GROCERY_BULK', productType: 'FOOD', bottleFormat: '5kg Tub', unitsPerCase: 1, casePriceZAR: null },
  { name: 'Sweet Chilli Sauce', category: 'GROCERY_BULK', productType: 'FOOD', bottleFormat: '3kg Tub', unitsPerCase: 1, casePriceZAR: null },
  { name: 'Sweet Chilli Sauce', category: 'GROCERY_BULK', productType: 'FOOD', bottleFormat: '5kg Tub', unitsPerCase: 1, casePriceZAR: null },

  // --- Dry goods ---
  { name: 'Beef Stock', category: 'DRY_GOODS', productType: 'FOOD', bottleFormat: 'Box', unitsPerCase: 1, casePriceZAR: null },
  { name: 'Salt', category: 'DRY_GOODS', productType: 'FOOD', bottleFormat: 'Box', unitsPerCase: 1, casePriceZAR: null },

  // --- Fresh produce: two more the founder listed that weren't catalogued at all ---
  { name: 'Yellow Peppers', category: 'FRESH_PRODUCE', productType: 'FOOD', bottleFormat: 'Box (Bulk)', unitsPerCase: 1, casePriceZAR: null },
  { name: 'Sweet Corn', category: 'FRESH_PRODUCE', productType: 'FOOD', bottleFormat: 'Box (Bulk)', unitsPerCase: 1, casePriceZAR: null },

  // --- Chicken, split into the three bulk forms the founder actually wants ---
  { name: 'Chicken Trays', category: 'MEAT', productType: 'FOOD', bottleFormat: 'Box (Bulk)', unitsPerCase: 1, casePriceZAR: null },
  { name: 'Chicken Legs', category: 'MEAT', productType: 'FOOD', bottleFormat: 'Sack (Bulk)', unitsPerCase: 1, casePriceZAR: null },

  // --- Water: the founder named three brands, still + sparkling, three
  // sizes, all as 24-packs. Confirmed with the founder that all three
  // brands genuinely come in both still and sparkling. ---
  { name: 'Valpre Still Water', category: 'WATER', productType: 'BEVERAGE', bottleFormat: 'Bottle (1L)', unitsPerCase: 24, casePriceZAR: null },
  { name: 'Valpre Still Water', category: 'WATER', productType: 'BEVERAGE', bottleFormat: 'Bottle (1.5L)', unitsPerCase: 24, casePriceZAR: null },
  { name: 'Valpre Sparkling Water', category: 'WATER', productType: 'BEVERAGE', bottleFormat: 'Bottle (500ml)', unitsPerCase: 24, casePriceZAR: null },
  { name: 'Valpre Sparkling Water', category: 'WATER', productType: 'BEVERAGE', bottleFormat: 'Bottle (1L)', unitsPerCase: 24, casePriceZAR: null },
  { name: 'Valpre Sparkling Water', category: 'WATER', productType: 'BEVERAGE', bottleFormat: 'Bottle (1.5L)', unitsPerCase: 24, casePriceZAR: null },
  { name: 'Tsitsikamma Still Water', category: 'WATER', productType: 'BEVERAGE', bottleFormat: 'Bottle (500ml)', unitsPerCase: 24, casePriceZAR: null },
  { name: 'Tsitsikamma Still Water', category: 'WATER', productType: 'BEVERAGE', bottleFormat: 'Bottle (1L)', unitsPerCase: 24, casePriceZAR: null },
  { name: 'Tsitsikamma Still Water', category: 'WATER', productType: 'BEVERAGE', bottleFormat: 'Bottle (1.5L)', unitsPerCase: 24, casePriceZAR: null },
  { name: 'Tsitsikamma Sparkling Water', category: 'WATER', productType: 'BEVERAGE', bottleFormat: 'Bottle (500ml)', unitsPerCase: 24, casePriceZAR: null },
  { name: 'Tsitsikamma Sparkling Water', category: 'WATER', productType: 'BEVERAGE', bottleFormat: 'Bottle (1L)', unitsPerCase: 24, casePriceZAR: null },
  { name: 'Tsitsikamma Sparkling Water', category: 'WATER', productType: 'BEVERAGE', bottleFormat: 'Bottle (1.5L)', unitsPerCase: 24, casePriceZAR: null },
  { name: 'Bonaqua Still Water', category: 'WATER', productType: 'BEVERAGE', bottleFormat: 'Bottle (500ml)', unitsPerCase: 24, casePriceZAR: null },
  { name: 'Bonaqua Still Water', category: 'WATER', productType: 'BEVERAGE', bottleFormat: 'Bottle (1L)', unitsPerCase: 24, casePriceZAR: null },
  { name: 'Bonaqua Still Water', category: 'WATER', productType: 'BEVERAGE', bottleFormat: 'Bottle (1.5L)', unitsPerCase: 24, casePriceZAR: null },
  { name: 'Bonaqua Sparkling Water', category: 'WATER', productType: 'BEVERAGE', bottleFormat: 'Bottle (500ml)', unitsPerCase: 24, casePriceZAR: null },
  { name: 'Bonaqua Sparkling Water', category: 'WATER', productType: 'BEVERAGE', bottleFormat: 'Bottle (1L)', unitsPerCase: 24, casePriceZAR: null },
  { name: 'Bonaqua Sparkling Water', category: 'WATER', productType: 'BEVERAGE', bottleFormat: 'Bottle (1.5L)', unitsPerCase: 24, casePriceZAR: null },
];

export async function backfillGroceryBulkCatalog() {
  let renamed = 0;
  for (const [oldName, oldBottleFormat, newFields] of RENAMES) {
    const existing = await prisma.sku.findFirst({ where: { name: oldName, bottleFormat: oldBottleFormat } });
    if (!existing) continue; // already renamed on a previous run, or never seeded
    await prisma.sku.update({ where: { id: existing.id }, data: newFields });
    renamed++;
  }

  let created = 0;
  for (const item of NEW_SKUS) {
    const before = await prisma.sku.findFirst({ where: { name: item.name, bottleFormat: item.bottleFormat } });
    await upsertSkuByNameAndBottleFormat(prisma, item, {});
    if (!before) created++;
  }

  if (renamed > 0 || created > 0) {
    console.log(`Grocery bulk catalogue backfill: ${renamed} row(s) resized/renamed, ${created} new row(s) created.`);
  }
  return { renamed, created };
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  backfillGroceryBulkCatalog()
    .then((result) => console.log('Done.', result))
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
