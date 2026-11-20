// Grocery bulk prices set at retail special prices (founder, 20 Nov 2026):
// the listed price is the special, shown in Bulk Buy as a SmartMatch bulk
// price that unlocks only when the group order reaches its bulk tier, never
// a single-purchase price. Prices read from PriceCheck's live listings on
// 20 Nov 2026, store named beside each. Runs once.
//
// An existing product only moves DOWN to the special: if today's special is
// above what we already list (sugar R249.95, oil R159.95) the current price
// stays, so a bulk price never rises above a verified shop price.
import prisma from '../config/db.js';
import { upsertSkuByNameAndBottleFormat } from '../utils/upsertSku.js';

export const FIX_NAME = 'grocery-specials-2026-11-20';

// [name, bottleFormat, special price for the whole bulk unit, source]
export const SPECIAL_UPDATES = [
  ['Maize Meal', '10kg Bag', 96.99, 'Iwisa Super Maize Meal 10kg, Game'],
  ['Samp', '10kg Bag', 89.99, 'Iwisa No.1 Samp 10kg, Shoprite'],
  ['Rice', '10kg Bag', 139.99, 'Tastic Parboiled Rice 10kg special, Pick n Pay'],
  ['Flour', '10kg Bag', 119.99, 'Sasko Cake Flour 10kg, 20% off, Pick n Pay'],
  ['Milk Long Life', '1L x 6-Pack', 77.95, 'Clover Ultra UHT Full Cream 6 x 1L, Shoprite'],
  ['Baked Beans', 'Pack of 24 x 410g Tins', 383.76, 'Lucky Star Baked Beans 410g R15.99 x 24, Shoprite'],
  ['Sugar', '10kg Bag', 249.95, 'Selati White Sugar 10kg, Game (above our price: kept)'],
  ['Cooking Oil', '5L', 159.95, 'Great Value Sunflower Oil 5L, Game (above our price: kept)'],
];

const food = { productType: 'FOOD' };
export const NEW_PRODUCTS = [
  { name: 'Pilchards in Tomato Sauce', bottleFormat: 'Case of 12 x 400g Tins', category: 'CANNED_GOODS', unitsPerCase: 12, casePriceZAR: 180.0, bulkUnit: 'case', bulkUnitPlural: 'cases', source: 'Glenryck 400g R15.00 x 12, Shoprite' },
  { name: 'Jungle Oats', bottleFormat: 'Case of 10 x 1kg', category: 'DRY_GOODS', unitsPerCase: 10, casePriceZAR: 399.9, bulkUnit: 'case', bulkUnitPlural: 'cases', source: 'Jungle Oats Original 1kg R39.99 x 10, Game' },
  { name: 'Peanut Butter', bottleFormat: 'Case of 6 x 800g Jars', category: 'DRY_GOODS', unitsPerCase: 6, casePriceZAR: 539.94, bulkUnit: 'case', bulkUnitPlural: 'cases', source: 'Black Cat Crunchy 800g R89.99 x 6, Checkers' },
  { name: 'Apricot Jam', bottleFormat: 'Case of 6 x 900g Jars', category: 'DRY_GOODS', unitsPerCase: 6, casePriceZAR: 251.94, bulkUnit: 'case', bulkUnitPlural: 'cases', source: 'Sunny Apricot Jam 900g R41.99 x 6, Pick n Pay' },
  { name: 'Mayonnaise', bottleFormat: 'Case of 12 x 750g Jars', category: 'GROCERY_BULK', unitsPerCase: 12, casePriceZAR: 479.88, bulkUnit: 'case', bulkUnitPlural: 'cases', source: 'Clover Tangy Mayonnaise 750g R39.99 x 12, Shoprite' },
  { name: 'Ricoffy Coffee', bottleFormat: '750g Tin', category: 'DRY_GOODS', unitsPerCase: 1, casePriceZAR: 145.0, bulkUnit: 'tin', bulkUnitPlural: 'tins', source: 'Nescafe Ricoffy 750g special, takealot' },
  { name: 'Tea Bags', bottleFormat: 'Box of 100 Tagless', category: 'DRY_GOODS', unitsPerCase: 1, casePriceZAR: 54.99, bulkUnit: 'box', bulkUnitPlural: 'boxes', source: 'Joko Tagless 100 special, Pick n Pay' },
  { name: 'Chicken Portions', bottleFormat: '5kg Box (Mixed Portions)', category: 'MEAT', unitsPerCase: 1, casePriceZAR: 229.99, bulkUnit: 'box', bulkUnitPlural: 'boxes', source: "Farmer's Choice Mixed Portions 5kg, Shoprite" },
  { name: 'Eggs', bottleFormat: 'Tray of 30 Large', category: 'FRESH_PRODUCE', unitsPerCase: 1, casePriceZAR: 49.99, bulkUnit: 'tray', bulkUnitPlural: 'trays', source: 'Top Lay Large Eggs 30, Shoprite' },
  { name: 'Washing Powder', bottleFormat: '5kg Bag (Hand Wash)', category: 'HOUSEHOLD', unitsPerCase: 1, casePriceZAR: 144.99, bulkUnit: 'bag', bulkUnitPlural: 'bags', productType: 'SUPPLIES', source: 'Surf Hand Washing Powder 5kg, Shoprite' },
];

export async function applyGrocerySpecials() {
  if (await prisma.dataFix.findUnique({ where: { name: FIX_NAME } })) return { lowered: 0, kept: 0, added: 0, skipped: true };
  let lowered = 0; let kept = 0; let added = 0;
  for (const [name, bottleFormat, special] of SPECIAL_UPDATES) {
    const sku = await prisma.sku.findFirst({ where: { name, bottleFormat } });
    if (!sku) continue;
    const current = sku.casePriceZAR != null ? Number(sku.casePriceZAR) : null;
    if (current == null || special < current) {
      await prisma.sku.update({ where: { id: sku.id }, data: { casePriceZAR: special } });
      lowered += 1;
    } else kept += 1;
  }
  for (const { source, productType, ...product } of NEW_PRODUCTS) {
    const exists = await prisma.sku.findFirst({ where: { name: product.name, bottleFormat: product.bottleFormat } });
    if (exists) continue;
    await upsertSkuByNameAndBottleFormat(prisma, { ...food, ...(productType ? { productType } : {}), ...product }, {});
    added += 1;
  }
  await prisma.dataFix.create({ data: { name: FIX_NAME } });
  console.log(`Grocery specials: ${lowered} lowered, ${kept} kept, ${added} added.`);
  return { lowered, kept, added, skipped: false };
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  applyGrocerySpecials()
    .then((r) => console.log('Done.', r))
    .catch((err) => { console.error(err); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
}
