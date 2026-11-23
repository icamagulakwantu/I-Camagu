// Shelf prices read off real shops on 23 Nov 2026 (PriceCheck, via
// TinyFish), for products whose shelf price was only an estimate (founder:
// "dig deeper, you'll find them"). Each becomes VERIFIED with its source;
// where a shop sells the same case for less than i-Camagu lists it, the bulk
// price drops to that (prices only go down). keepBulkBelowShelf then holds
// every bulk price at least 5% under these shelf prices. Runs once.
//
// Belgravia and Smirnoff Storm cans are handled in cans-440ml-nov-2026.js:
// shops sell them as 440 ml cans, and the founder had them resized to match.
import prisma from '../config/db.js';

export const FIX_NAME = 'verified-shelf-prices-2026-11-23';
const CHECKED_AT = new Date('2026-11-23T12:00:00Z');
const takealot = 'takealot.com regular R219.00 a bottle (special R189), PriceCheck 23 Nov 2026, x 12';
const goodfellows6 = 'Norman Goodfellows R1,134 for 6, x 2';

export const VERIFIED_SHELF_PRICES = [
  { name: 'Banana Liqueur (Butlers)', bottleFormat: '750ml Bottle', retail: 2628.0, source: takealot },
  { name: 'Blue Curacao (Butlers)', bottleFormat: '750ml Bottle', retail: 2628.0, source: takealot, bulk: 2268.0, bulkSource: goodfellows6 },
  { name: 'Cherry Kirsch Liqueur (Butlers)', bottleFormat: '750ml Bottle', retail: 2628.0, source: takealot, bulk: 2268.0, bulkSource: goodfellows6 },
  { name: 'Espresso/Coffee Liqueur (Butlers)', bottleFormat: '750ml Bottle', retail: 2628.0, source: takealot },
  { name: 'Ginger Liqueur (Butlers)', bottleFormat: '750ml Bottle', retail: 2628.0, source: takealot },
  { name: 'Peppermint Liqueur (Butlers)', bottleFormat: '750ml Bottle', retail: 2628.0, source: takealot },
  { name: 'Triple Sec Premium (San Basile)', bottleFormat: '750ml Bottle', retail: 5759.88, source: 'Mothercity Liquor R479.99 a bottle, PriceCheck 23 Nov 2026, x 12' },
  { name: 'Ponchos Tequila Coffee', bottleFormat: '750ml Bottle', retail: 4079.88, source: 'Shoprite and Checkers R339.99 a bottle, PriceCheck 23 Nov 2026, x 12' },
  { name: 'Martell Blue Swift VSOP', bottleFormat: '750ml Bottle', retail: 11999.88, source: 'Shoprite R999.99 a bottle, PriceCheck 23 Nov 2026, x 12', bulk: 10188.0, bulkSource: 'Norman Goodfellows R10,188 for 12' },
  { name: 'Remy Martin 1738 Accord Royal', bottleFormat: '750ml Bottle', retail: 19199.88, source: 'Pick n Pay R1,599.99 a bottle, PriceCheck 23 Nov 2026, x 12' },
  { name: 'Clase Azul Plata', bottleFormat: '750ml Bottle', retail: 35999.88, source: 'Mothercity Liquor R2,999.99 a bottle, PriceCheck 23 Nov 2026, x 12' },
  { name: 'Clase Azul Reposado', bottleFormat: '750ml Bottle', retail: 51599.88, source: 'Woolworths R4,299.99 a bottle (Pick n Pay R4,999.99), PriceCheck 23 Nov 2026, x 12', bulk: 41268.0, bulkSource: 'Norman Goodfellows R20,634 for 6, x 2' },
  { name: 'Corona', bottleFormat: 'Quart (600ml)', retail: 329.99, source: 'Shoprite, Corona Extra 12 x 600 ml box R329.99, PriceCheck 23 Nov 2026' },
  { name: 'Carrots', bottleFormat: '10kg Sack', retail: 99.95, source: 'Evergreens, carrots 10 kg bag R99.95 (TinyFish search, 23 Nov 2026)' },
];

export async function applyVerifiedShelfPrices(list = VERIFIED_SHELF_PRICES, fixName = FIX_NAME) {
  if (await prisma.dataFix.findUnique({ where: { name: fixName } })) return { verified: 0, lowered: 0, skipped: true };
  let verified = 0;
  let lowered = 0;
  for (const p of list) {
    const sku = await prisma.sku.findFirst({ where: { name: p.name, bottleFormat: p.bottleFormat, retiredAt: null } });
    if (!sku) continue;
    const data = { retailPriceZAR: p.retail, retailPriceSource: 'VERIFIED', retailPriceCheckedAt: CHECKED_AT, retailPriceNote: p.source };
    const current = sku.casePriceZAR == null ? null : Number(sku.casePriceZAR);
    if (p.bulk != null && (current == null || p.bulk < current)) {
      data.casePriceZAR = p.bulk;
      data.retailPriceNote = `${p.source}. Bulk: ${p.bulkSource}.`;
      lowered += 1;
    }
    await prisma.sku.update({ where: { id: sku.id }, data });
    verified += 1;
  }
  await prisma.dataFix.create({ data: { name: fixName } });
  if (verified) console.log(`Shelf prices: ${verified} verified, ${lowered} bulk price(s) lowered to a shop's case price.`);
  return { verified, lowered, skipped: false };
}
