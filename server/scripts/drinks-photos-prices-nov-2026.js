// Drinks: the founder's own packshots (22 Nov 2026), new drinks, and water
// prices checked online (PriceCheck, Loyalty Hub, retailer pages and the
// M'hudi winery's shop, read through TinyFish on 22 Nov 2026).
//
// Rules, as everywhere in Bulk Buy:
//   - A bulk price only ever moves DOWN. The water prices were estimates,
//     far above the shops (Valpre 1.5L at about R30 a bottle).
//   - retail is a regular shelf price for the same number of units, from a
//     named shop, recorded only where one was read; a bulk price is never
//     above it.
//   - The founder's photos replace whatever the product showed before.
// Runs once.
import prisma from '../config/db.js';

export const FIX_NAME = 'drinks-photos-prices-2026-11-22';

const img = (file) => `/images/brands/drinks/${file}.webp`;
const drink = { productType: 'BEVERAGE', bulkUnit: 'case', bulkUnitPlural: 'cases' };
const alcohol = { productType: 'ALCOHOL', bulkUnit: 'case', bulkUnitPlural: 'cases' };

// [name, bottleFormat, photo]
export const PHOTOS = [
  ['Schweppes Soda Water', 'Bottle (1L)', 'schweppes-soda-water-1l'],
  ['Schweppes Dry Lemon', 'Bottle (1L)', 'schweppes-dry-lemon-1l'],
  ['Schweppes Indian Tonic Water', 'Bottle (1L)', 'schweppes-tonic-water-1l'],
  ['Liqui Fruit Cranberry Cooler', 'Carton (1L)', 'liqui-fruit-cranberry-cooler-1l'],
  ['Guinness Draught Stout', 'Can (440ml)', 'guinness-draught-can-440ml'],
  ['Coca-Cola', 'Bottle (300ml)', 'coca-cola-bottle-300ml'],
  ['Aquelle Sparkling Water', 'Bottle (500ml)', 'aquelle-sparkling-500ml'],
  ['Aquelle Still Water', 'Bottle (1.5L)', 'aquelle-still-1-5l'],
  ['Tsitsikamma Sparkling Water', 'Bottle (500ml)', 'tsitsikamma-sparkling-500ml'],
  ['Tsitsikamma Sparkling Water', 'Bottle (1L)', 'tsitsikamma-sparkling-1l'],
  ['Tsitsikamma Still Water', 'Bottle (500ml)', 'tsitsikamma-still-500ml'],
  ['Tsitsikamma Still Water', 'Bottle (1.5L)', 'tsitsikamma-still-1-5l'],
  ['Valpre Sparkling Water', 'Bottle (1L)', 'valpre-sparkling-1l'],
  ['Valpre Still Water', 'Bottle (1.5L)', 'valpre-still-1-5l'],
];

// [name, bottleFormat, bulk for the whole case, retail for the same units or null, source]
export const PRICE_UPDATES = [
  ['Tsitsikamma Still Water', 'Bottle (500ml)', 215.76, 215.76, 'Pick n Pay R8.99 a bottle x 24 (Loyalty Hub, 28 Sep 2026)'],
  ['Tsitsikamma Sparkling Water', 'Bottle (500ml)', 239.76, 239.76, 'Pick n Pay R9.99 a bottle x 24 (Loyalty Hub, 27 Oct 2026)'],
  ['Tsitsikamma Still Water', 'Bottle (1.5L)', 395.96, 407.76, 'Pick n Pay 6 x 1.5L R98.99, x 4; R16.99 a bottle'],
  ['Tsitsikamma Sparkling Water', 'Bottle (1.5L)', 359.76, 407.76, 'Mr D R14.99 a bottle x 24; Pick n Pay R16.99'],
  ['Valpre Still Water', 'Bottle (500ml)', 235.0, 319.96, "Norman Goodfellow's 24 x 500ml R235; Pick n Pay 6 x 500ml R79.99"],
  ['Valpre Still Water', 'Bottle (1.5L)', 338.0, 527.76, "Norman Goodfellow's 12 x 1.5L R169, x 2; Pick n Pay R21.99 a bottle"],
  ['Valpre Sparkling Water', 'Bottle (500ml)', 235.0, 335.76, "Norman Goodfellow's 24 x 500ml R235; Superb Hyper R13.99 a bottle"],
  ['Valpre Sparkling Water', 'Bottle (1L)', 298.0, 776.0, "Norman Goodfellow's 12 x 1L R149, x 2; takealot regular 12 x 1L R388"],
];

export const NEW_PRODUCTS = [
  { ...drink, name: 'Coca-Cola', bottleFormat: 'Can (500ml)', category: 'SOFT_DRINKS', unitsPerCase: 24, casePriceZAR: 234.99, retailPriceZAR: 311.76, imageUrl: img('coca-cola-can-500ml'), source: 'Superb Hyper 24 x 500ml special R234.99 (was R269.99); Game R12.99 a can' },
  { ...drink, name: 'Coca-Cola Original Taste Less Sugar', bottleFormat: 'Bottle (2L)', category: 'SOFT_DRINKS', unitsPerCase: 6, casePriceZAR: 107.94, retailPriceZAR: null, imageUrl: img('coca-cola-less-sugar-2l'), source: 'Broadway Pharmacy R17.99 a bottle x 6; no supermarket shelf price read' },
  { ...drink, name: 'Red Bull Energy Drink', bottleFormat: 'Can (355ml)', category: 'SOFT_DRINKS', unitsPerCase: 24, casePriceZAR: 498.0, retailPriceZAR: 650.0, imageUrl: img('red-bull-can-355ml'), source: 'Amazon ZA 24 x 355ml special R498 (was R650)' },
  { ...drink, name: 'Appletiser', bottleFormat: 'Bottle (1.25L)', category: 'SOFT_DRINKS', unitsPerCase: 6, casePriceZAR: 269.94, retailPriceZAR: 269.94, imageUrl: img('appletiser-1-25l'), source: 'Checkers, Shoprite and Pick n Pay R44.99 a bottle x 6 (no special running)' },
  { ...drink, name: 'Aquelle Still Water', bottleFormat: 'Bottle (500ml)', category: 'WATER', unitsPerCase: 24, casePriceZAR: 191.76, retailPriceZAR: 239.76, imageUrl: img('aquelle-still-500ml'), source: 'Game R7.99 a bottle x 24; Pick n Pay R9.99' },
  { ...drink, name: 'Aquelle Sparkling Water', bottleFormat: 'Bottle (1.5L)', category: 'WATER', unitsPerCase: 6, casePriceZAR: 93.49, retailPriceZAR: null, imageUrl: img('aquelle-sparkling-1-5l'), source: 'Pick n Pay 6 x 1.5L R93.49' },
  { ...alcohol, name: "M'hudi Chenin Blanc", bottleFormat: '750ml Bottle', category: 'WINE', unitsPerCase: 6, casePriceZAR: 1314.0, retailPriceZAR: 1314.0, imageUrl: img('mhudi-chenin-blanc-750ml'), source: "M'hudi winery shop, Chenin Blanc 2025 case of 6 R1,314" },
  { ...alcohol, name: "M'hudi Pinotage", bottleFormat: '750ml Bottle', category: 'WINE', unitsPerCase: 6, casePriceZAR: 1254.0, retailPriceZAR: 1254.0, imageUrl: img('mhudi-pinotage-750ml'), source: "M'hudi winery shop, Pinotage 2024 case of 6 R1,254" },
];

export async function applyDrinksPhotosPrices() {
  if (await prisma.dataFix.findUnique({ where: { name: FIX_NAME } })) return { photos: 0, lowered: 0, added: 0, skipped: true };
  const checkedAt = new Date('2026-11-22T12:00:00Z');
  let photos = 0;
  let lowered = 0;
  let added = 0;
  for (const [name, bottleFormat, file] of PHOTOS) {
    const r = await prisma.sku.updateMany({ where: { name, bottleFormat }, data: { imageUrl: img(file) } });
    photos += r.count;
  }
  for (const [name, bottleFormat, bulk, retail, source] of PRICE_UPDATES) {
    const sku = await prisma.sku.findFirst({ where: { name, bottleFormat } });
    if (!sku) continue;
    const current = sku.casePriceZAR != null ? Number(sku.casePriceZAR) : null;
    const data = {};
    if (current == null || bulk < current) { data.casePriceZAR = bulk; lowered += 1; }
    const nextBulk = data.casePriceZAR ?? current;
    if (retail != null && nextBulk != null && nextBulk <= retail) {
      Object.assign(data, { retailPriceZAR: retail, retailPriceSource: 'VERIFIED', retailPriceCheckedAt: checkedAt, retailPriceNote: `Online, 22 Nov 2026: ${source}` });
    }
    if (Object.keys(data).length) await prisma.sku.update({ where: { id: sku.id }, data });
  }
  for (const { source, ...product } of NEW_PRODUCTS) {
    if (await prisma.sku.findFirst({ where: { name: product.name, bottleFormat: product.bottleFormat } })) continue;
    const verified = product.retailPriceZAR != null;
    await prisma.sku.create({
      data: {
        ...product,
        retailPriceSource: verified ? 'VERIFIED' : null,
        retailPriceCheckedAt: verified ? checkedAt : null,
        retailPriceNote: `Online, 22 Nov 2026: ${source}`,
      },
    });
    added += 1;
  }
  await prisma.dataFix.create({ data: { name: FIX_NAME } });
  console.log(`Drinks: ${photos} photos, ${lowered} prices lowered, ${added} added.`);
  return { photos, lowered, added, skipped: false };
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  applyDrinksPhotosPrices()
    .then((r) => console.log('Done.', r))
    .catch((err) => { console.error(err); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
}
