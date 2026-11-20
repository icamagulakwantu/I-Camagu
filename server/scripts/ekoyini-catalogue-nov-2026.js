// Products from the Ekoyini catalogue that Bulk Buy did not yet carry
// (founder, 20 Nov 2026): same names, pack sizes and packshots as Ekoyini,
// priced the i-Camagu way. The bulk price is the best special or case price
// found online on 20 Nov 2026 (PriceCheck's live listings, store named
// beside each). It is a SmartMatch bulk price, unlocked when the group order
// reaches its bulk tier, never a single-purchase price.
//
// retail is the regular single-bottle shelf price times the pack, from a
// named store, so the saving shown is real. Where no regular shelf price
// could be read (only a specialist's case price), retail is left empty and
// no saving is claimed. A bulk price is never above its retail price.
//
// Create-only: a product that already exists is left exactly as it is.
// Runs once.
import prisma from '../config/db.js';

export const FIX_NAME = 'ekoyini-catalogue-2026-11-20';

const img = (file) => `/images/brands/${file}`;
const alcohol = { productType: 'ALCOHOL', bulkUnit: 'case', bulkUnitPlural: 'cases' };
const drink = { productType: 'BEVERAGE', bulkUnit: 'case', bulkUnitPlural: 'cases' };

// casePriceZAR: bulk price for the whole case. retailPriceZAR: regular shelf
// price for the same number of units (null when not verified).
export const EKOYINI_PRODUCTS = [
  // Brandy
  { ...alcohol, name: 'KWV 3 Year Old', bottleFormat: '750ml Bottle', category: 'BRANDY', unitsPerCase: 12, casePriceZAR: 2268.0, retailPriceZAR: 2639.88, imageUrl: img('kwv-3-year-brandy.webp'), source: 'Lowest PriceCheck offer R189.00 x 12; regular R219.99 at Shoprite and Checkers' },
  { ...alcohol, name: 'KWV 5 Year Old', bottleFormat: '750ml Bottle', category: 'BRANDY', unitsPerCase: 12, casePriceZAR: 2388.0, retailPriceZAR: 2999.88, imageUrl: img('kwv-5-year-brandy.webp'), source: 'Lowest PriceCheck offer R199.00 x 12; regular R249.99 at Shoprite and Checkers' },
  { ...alcohol, name: 'KWV 10 Year Old', bottleFormat: '750ml Bottle', category: 'BRANDY', unitsPerCase: 6, casePriceZAR: 2550.0, retailPriceZAR: 2759.94, imageUrl: img('kwv-10-year-brandy.webp'), source: 'takealot special R425 (was R459) x 6; regular R459.99 at Checkers' },
  { ...alcohol, name: 'KWV 15 Year Old', bottleFormat: '750ml Bottle', category: 'BRANDY', unitsPerCase: 6, casePriceZAR: 5299.0, retailPriceZAR: 6299.94, imageUrl: img('kwv-15-year-brandy.webp'), source: 'takealot case of 6 special R5,299 (was R5,799); regular R1,049.99 at Mothercity Liquor' },
  { ...alcohol, name: 'Richelieu International', bottleFormat: '750ml Bottle', category: 'BRANDY', unitsPerCase: 12, casePriceZAR: 2548.0, retailPriceZAR: 2879.88, imageUrl: img('richelieu-international-brandy.webp'), source: 'takealot case of 12 special R2,548 (was R2,799); regular R239.99 at Shoprite and Checkers' },
  { ...alcohol, name: 'Olof Bergh Solera', bottleFormat: '750ml Bottle', category: 'BRANDY', unitsPerCase: 12, casePriceZAR: 2399.88, retailPriceZAR: 2639.88, imageUrl: img('olof-bergh-solera-brandy.webp'), source: 'Pick n Pay R199.99 x 12; regular R219.99 at Mothercity Liquor' },
  // Whisky
  { ...alcohol, name: "Maker's Mark Bourbon", bottleFormat: '750ml Bottle', category: 'WHISKY', unitsPerCase: 12, casePriceZAR: 4668.0, retailPriceZAR: 6108.0, imageUrl: img('makers-mark-bourbon.webp'), source: "Norman Goodfellow's case of 12 R4,668; R509 at takealot" },
  { ...alcohol, name: 'Redbreast 12 Year Old', bottleFormat: '750ml Bottle', category: 'WHISKY', unitsPerCase: 6, casePriceZAR: 8394.0, retailPriceZAR: 9599.94, imageUrl: img('redbreast-12-year.webp'), source: 'takealot special R1,399 (was R1,599) x 6; regular R1,599.99 at Pick n Pay' },
  { ...alcohol, name: 'The Glenlivet 15 Year', bottleFormat: '750ml Bottle', category: 'WHISKY', unitsPerCase: 6, casePriceZAR: 6899.94, retailPriceZAR: 7799.94, imageUrl: img('glenlivet-15-year.webp'), source: 'Checkers R1,149.99 x 6; regular R1,299.99 at Shoprite' },
  // Vodka, tequila, liqueur, champagne
  { ...alcohol, name: 'Smirnoff 1818 Vodka', bottleFormat: '750ml Bottle', category: 'VODKA', unitsPerCase: 12, casePriceZAR: 1899.0, retailPriceZAR: 2159.88, imageUrl: img('smirnoff-1818-vodka-750ml.webp'), source: 'takealot case of 12 special R1,899 (was R2,099); regular R179.99 at Shoprite, Checkers and Pick n Pay' },
  { ...alcohol, name: 'Espolon Reposado', bottleFormat: '750ml Bottle', category: 'TEQUILA_PREMIUM', unitsPerCase: 6, casePriceZAR: 2934.0, retailPriceZAR: null, imageUrl: img('espolon-reposado.webp'), source: "Norman Goodfellow's case of 6 R2,934; no supermarket shelf price found" },
  { ...alcohol, name: 'Drambuie', bottleFormat: '750ml Bottle', category: 'LIQUEUR', unitsPerCase: 12, casePriceZAR: 5028.0, retailPriceZAR: null, imageUrl: img('drambuie-750ml.jpg'), source: "Norman Goodfellow's case of 12 R5,028; no supermarket shelf price found" },
  { ...alcohol, name: 'G.H. Mumm Grand Cordon', bottleFormat: '750ml Bottle', category: 'CHAMPAGNE', unitsPerCase: 6, casePriceZAR: 4014.0, retailPriceZAR: null, imageUrl: img('gh-mumm-grand-cordon.webp'), source: "Norman Goodfellow's case of 6 R4,014; no supermarket shelf price found" },
  // Wine
  { ...alcohol, name: 'Robertson Chapel Red', bottleFormat: '1.5L Bottle', category: 'WINE', unitsPerCase: 6, casePriceZAR: 659.94, retailPriceZAR: 659.94, imageUrl: img('robertson-chapel-red-1-5l.webp'), source: 'Pick n Pay R109.99 x 6 (no special running)' },
  // Beer and ready-to-drink
  { ...alcohol, name: 'Guinness Draught Stout', bottleFormat: 'Can (440ml)', category: 'BEER', unitsPerCase: 24, casePriceZAR: 649.99, retailPriceZAR: 695.76, imageUrl: img('guinness-draught-can-440ml.webp'), source: 'Mothercity Liquor case of 24 R649.99; regular R28.99 a can at Shoprite' },
  { ...alcohol, name: 'Miller Genuine Draft', bottleFormat: 'Dumpy (330ml)', category: 'BEER', unitsPerCase: 24, casePriceZAR: 394.99, retailPriceZAR: 527.76, imageUrl: img('miller-genuine-draft-6x330.webp'), source: 'Shoprite 24 x 330ml R394.99; regular R21.99 a bottle at Shoprite' },
  { ...alcohol, name: 'Castle Double Malt', bottleFormat: 'Can (500ml)', category: 'BEER', unitsPerCase: 24, casePriceZAR: 334.99, retailPriceZAR: null, imageUrl: img('castle-double-malt-can-500ml.webp'), source: 'Shoprite 24 x 500ml cans R334.99; no single-can shelf price found' },
  { ...alcohol, name: 'Belgravia Gin & Tonic', bottleFormat: 'Can (440ml)', category: 'CIDER_RTD', unitsPerCase: 24, casePriceZAR: 569.99, retailPriceZAR: 719.76, imageUrl: img('belgravia-gin-tonic-can-440ml.webp'), source: 'Pick n Pay 24 x 440ml R569.99; regular R29.99 a can at Shoprite and Checkers' },
  // Mixers, juice, energy, water
  { ...alcohol, name: 'Schweppes Indian Tonic Water', bottleFormat: 'Bottle (1L)', category: 'MIXER', unitsPerCase: 12, casePriceZAR: 199.0, retailPriceZAR: 263.88, imageUrl: null, source: "Norman Goodfellow's 12 x 1L R199; regular R21.99 at Shoprite and Checkers" },
  { ...alcohol, name: 'Schweppes Soda Water', bottleFormat: 'Bottle (1L)', category: 'MIXER', unitsPerCase: 12, casePriceZAR: 199.0, retailPriceZAR: 263.88, imageUrl: img('schweppes-soda-water-1l.webp'), source: "Norman Goodfellow's 12 x 1L R199; regular R21.99 at Shoprite, Checkers and Pick n Pay" },
  { ...alcohol, name: 'Schweppes Dry Lemon', bottleFormat: 'Bottle (1L)', category: 'MIXER', unitsPerCase: 12, casePriceZAR: 255.99, retailPriceZAR: 263.88, imageUrl: img('schweppes-dry-lemon-1l.webp'), source: 'Pick n Pay 12 x 1L R255.99; regular R21.99 at Shoprite and Checkers' },
  { ...drink, name: 'Liqui Fruit Cranberry Cooler', bottleFormat: 'Carton (1L)', category: 'SOFT_DRINKS', unitsPerCase: 6, casePriceZAR: 114.0, retailPriceZAR: 239.94, imageUrl: img('liqui-fruit-cranberry-cooler-1l.webp'), source: 'takealot 6 x 1L R114; regular R39.99 at Shoprite and Checkers' },
  { ...drink, name: 'Mofaya Original Energy Drink', bottleFormat: 'Can (500ml)', category: 'SOFT_DRINKS', unitsPerCase: 24, casePriceZAR: 429.0, retailPriceZAR: null, imageUrl: img('mofaya-original-can-500ml.jpg'), source: 'takealot case of 24 R429; no single-can shelf price found' },
  { ...drink, name: 'Aquelle Still Water', bottleFormat: 'Bottle (1.5L)', category: 'WATER', unitsPerCase: 6, casePriceZAR: 77.94, retailPriceZAR: 95.94, imageUrl: img('aquelle-still-1-5l.webp'), source: 'Game R12.99 x 6; regular R15.99 at Pick n Pay' },
  { ...drink, name: 'Aquelle Sparkling Water', bottleFormat: 'Bottle (500ml)', category: 'WATER', unitsPerCase: 24, casePriceZAR: 239.76, retailPriceZAR: 239.76, imageUrl: img('aquelle-sparkling-500ml.jpg'), source: 'Pick n Pay R9.99 x 24 (no special running)' },
];

export async function addEkoyiniProducts() {
  if (await prisma.dataFix.findUnique({ where: { name: FIX_NAME } })) return { added: 0, skipped: true };
  const checkedAt = new Date('2026-11-20T12:00:00Z');
  let added = 0;
  for (const { source, ...product } of EKOYINI_PRODUCTS) {
    const exists = await prisma.sku.findFirst({ where: { name: product.name, bottleFormat: product.bottleFormat } });
    if (exists) continue;
    const verified = product.retailPriceZAR != null;
    await prisma.sku.create({
      data: {
        ...product,
        supplierPortfolio: null,
        retailPriceSource: verified ? 'VERIFIED' : null,
        retailPriceCheckedAt: verified ? checkedAt : null,
        retailPriceNote: `PriceCheck, 20 Nov 2026: ${source}`,
      },
    });
    added += 1;
  }
  await prisma.dataFix.create({ data: { name: FIX_NAME } });
  console.log(`Ekoyini catalogue: ${added} products added.`);
  return { added, skipped: false };
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  addEkoyiniProducts()
    .then((r) => console.log('Done.', r))
    .catch((err) => { console.error(err); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
}
