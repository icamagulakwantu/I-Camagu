// Quart sizes corrected (founder, 20 Nov 2026). Several returnable quarts
// were listed as 750ml; shops sell them as 660ml (Ekoyini's catalogue had
// them right). Checked on PriceCheck's live listings, 20 Nov 2026:
//   660ml: Amstel, Castle Lite, Windhoek Lager and Draught, Hunter's Dry and
//          Gold, Strongbow Gold Apple and Red Berries.
//   750ml (unchanged): Castle Lager, Black Label, Hansa, Lion, Milk Stout.
//   Brutal Fruit has no quart at all (275ml bottles and 500ml cans), and its
//   bottle is 275ml, not 330ml. The Savanna "quart" is a 500ml bottle.
//
// The bulk price only ever moves DOWN, to the shop's case price where ours
// was higher, so a bulk price never sits above a verified shop price. A
// photo is filled in only where the product had none. Runs once.
import prisma from '../config/db.js';

export const FIX_NAME = 'quart-sizes-2026-11-20';

const img = (file) => `/images/brands/${file}`;

// [name, from, to, { bulk, retail, image, note }]
export const RELABELS = [
  ['Amstel Lager', 'Quart (750ml)', 'Quart (660ml)', { bulk: 247.99, retail: 299.88, note: 'Shoprite 12 x 660ml R247.99; R24.99 a bottle' }],
  ['Castle Lite', 'Quart (750ml)', 'Quart (660ml)', { retail: 311.88, note: 'Castle Lite 660ml R25.99 a bottle (LiquorIQ, 28 Oct 2026)' }],
  ['Windhoek Lager', 'Quart (750ml)', 'Quart (660ml)', { retail: 323.88, note: 'Shoprite R26.99 a 660ml bottle' }],
  ['Windhoek Draught', 'Quart (750ml)', 'Quart (660ml)', { bulk: 287.99, retail: 323.88, note: 'Shoprite 12 x 660ml R287.99; R26.99 a bottle' }],
  ["Hunter's Dry", 'Quart (750ml)', 'Quart (660ml)', { bulk: 348.0, retail: 348.0, image: img('hunters-dry.png'), note: 'Pick n Pay R29.00 a 660ml bottle incl. deposit' }],
  ["Hunter's Gold", 'Quart (750ml)', 'Quart (660ml)', { bulk: 348.0, note: "Priced as Hunter's Dry 660ml (Pick n Pay R29.00)" }],
  ['Strongbow Gold Apple', 'Quart (750ml)', 'Quart (660ml)', { bulk: 317.99, retail: 347.88, image: img('strongbow-gold-apple.png'), note: 'Shoprite 12 x 660ml R317.99; R28.99 a bottle' }],
  ['Strongbow Red Berries', 'Quart (750ml)', 'Quart (660ml)', { bulk: 317.99, image: img('strongbow-red-berries.png'), note: 'Priced as Strongbow Gold Apple 660ml (Shoprite 12 x 660ml R317.99)' }],
  ['Brutal Fruit Ruby Apple', 'Dumpy (330ml)', 'Dumpy (275ml)', { bulk: 354.99, retail: 399.96, note: 'Shoprite 24 x 275ml R354.99; R99.99 a six' }],
  ['Brutal Fruit Strawberry Rouge', 'Dumpy (330ml)', 'Dumpy (275ml)', { bulk: 354.99, retail: 399.96, note: 'Shoprite and Checkers 24 x 275ml R354.99; R99.99 a six' }],
  ['Savanna Dry', 'Quart (500ml)', 'NRB (500ml)', { bulk: 329.99, retail: 419.88, note: 'Shoprite and Checkers 12 x 500ml R329.99; R34.99 a bottle' }],
];

// Products that do not exist in the shops.
export const RETIRE = [
  ['Brutal Fruit Ruby Apple', 'Quart (750ml)'],
  ['Brutal Fruit Strawberry Rouge', 'Quart (750ml)'],
];

export async function correctQuartSizes() {
  if (await prisma.dataFix.findUnique({ where: { name: FIX_NAME } })) return { relabelled: 0, retired: 0, skipped: true };
  const checkedAt = new Date('2026-11-20T12:00:00Z');
  let relabelled = 0;
  let retired = 0;
  for (const [name, from, to, { bulk, retail, image, note }] of RELABELS) {
    const sku = await prisma.sku.findFirst({ where: { name, bottleFormat: from } });
    if (!sku) continue;
    if (await prisma.sku.findFirst({ where: { name, bottleFormat: to } })) continue;
    const data = { bottleFormat: to };
    const current = sku.casePriceZAR != null ? Number(sku.casePriceZAR) : null;
    if (bulk != null && (current == null || bulk < current)) data.casePriceZAR = bulk;
    const nextBulk = data.casePriceZAR ?? current;
    if (retail != null && (nextBulk == null || nextBulk <= retail)) {
      Object.assign(data, { retailPriceZAR: retail, retailPriceSource: 'VERIFIED', retailPriceCheckedAt: checkedAt });
    }
    data.retailPriceNote = `PriceCheck, 20 Nov 2026: ${note}`;
    if (image && !sku.imageUrl) data.imageUrl = image;
    await prisma.sku.update({ where: { id: sku.id }, data });
    relabelled += 1;
  }
  for (const [name, bottleFormat] of RETIRE) {
    const r = await prisma.sku.updateMany({ where: { name, bottleFormat, retiredAt: null }, data: { retiredAt: new Date() } });
    retired += r.count;
  }
  await prisma.dataFix.create({ data: { name: FIX_NAME } });
  console.log(`Quart sizes: ${relabelled} relabelled, ${retired} retired.`);
  return { relabelled, retired, skipped: false };
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  correctQuartSizes()
    .then((r) => console.log('Done.', r))
    .catch((err) => { console.error(err); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
}
