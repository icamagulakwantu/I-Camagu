// Sizes as the shops sell them (founder, 23 Nov 2026):
//   Valpré still 500ml and 1.5L; sparkling 500ml and 1L. Bonaqua still 500ml
//   and 1.5L. Chillers Punch 440ml. Kopparberg 330ml dumpy and 440ml can.
//   Breezer 440ml. Bernini 500ml. Flying Fish 660ml. Food: the bigger packs
//   the shops sell. Maraschino cherries removed from the list.
//
// Rows at a size no shop sells are retired (kept for history, never shown)
// when the size the shops sell is already listed; otherwise they are
// relabelled to it. A shelf price found on the shops' own listings is marked
// verified; where none was found the old estimate is scaled to the new size
// and stays an estimate. The bulk price only ever moves down, and stays at
// least 5% below a verified shelf price (bulk-below-shelf runs after this).
// Runs once.
import prisma from '../config/db.js';
import { photoUrl } from './product-photos-nov-2026.js';

export const FIX_NAME = 'shop-sizes-2026-11-23';

export const RETIRE = [
  ['Valpre Still Water', 'Bottle (1L)'],
  ['Valpre Sparkling Water', 'Bottle (1.5L)'],
  ['Bonaqua Still Water', 'Bottle (1L)'],
  // Plain Bonaqua sparkling is sold at 500ml only (1.5L comes flavoured).
  ['Bonaqua Sparkling Water', 'Bottle (1L)'],
  ['Bonaqua Sparkling Water', 'Bottle (1.5L)'],
  // Chillers Punch comes in 440ml cans, already listed.
  ['Chillers Punch Caribbean Chaos', 'Dumpy (500ml)'],
  ['Chillers Punch Milano Spritz', 'Dumpy (500ml)'],
  ['Chillers Punch Peach & Mango', 'Dumpy (500ml)'],
  ['Chillers Punch Tequila Sunrise (Zero Alcohol)', 'Dumpy (500ml)'],
  ['Maraschino Cherries (Syrup)', '350ml Jar'],
  // Food: the 10kg bag is the biggest the shops sell, already listed.
  ['Rice', '12.5kg Bag'],
  ['Amazimba', '12.5kg Bag'],
  ['Umbona', '12.5kg Bag'],
];

const KOPPARBERG_330 = { retail: 699.99, note: 'Pick n Pay 24 x 330ml R699.99; Checkers R36.99 a bottle' };
const scaled = (ratio, note) => ({ scale: ratio, note });

// [name, from, to, { retail (verified) | scale (estimate), unitsPerCase?, slug?, note }]
export const RELABELS = [
  ...['Kopparberg Mixed Fruit', 'Kopparberg Pear', 'Kopparberg Raspberry', 'Kopparberg Strawberry & Lime']
    .map((n) => [n, 'Bottle (500ml)', 'Dumpy (330ml)', KOPPARBERG_330]),
  ...['Kopparberg Mixed Fruit', 'Kopparberg Pear', 'Kopparberg Raspberry', 'Kopparberg Strawberry & Lime', 'Kopparberg Sweet Vintage Pear']
    .map((n) => [n, 'Can (500ml)', 'Can (440ml)', scaled(440 / 500, 'Estimate scaled from the 500ml can; no 440ml listing found yet')]),
  ...['Breezer Blackberry', 'Breezer Blueberry', 'Breezer Watermelon']
    .map((n) => [n, 'Can (500ml)', 'Can (440ml)', scaled(440 / 500, 'Estimate scaled from the 500ml can; Shoprite lists Breezer 440ml cans')]),
  ['Butter', '1kg', '500g Brick', { retail: 89.99, slug: 'butter-500g-brick', note: 'Crystal Valley Salted Butter Brick 500g, Checkers R89.99' }],
  ['Tea', '1kg Box', '500g Loose Leaf', { retail: 139.99, slug: 'tea-500g-loose-leaf', note: 'Five Roses Loose Leaf Tea 500g, Shoprite R139.99' }],
  ['Instant Coffee', '750g Big Tin', '200g Jar', { retail: 149.99, slug: 'instant-coffee-200g-jar', note: 'NESCAFÉ Classic Instant Coffee 200g, Shoprite R149.99' }],
  ['Sweet Chilli Sauce', '3kg Tub', '840g Bottle', { retail: 64.99, slug: 'sweet-chilli-sauce-840g', note: "Mrs H.S. Ball's Sweet Chilli Sauce 840g, Checkers R64.99" }],
];

const round2 = (n) => Math.round(n * 100) / 100;

export async function fixShopSizes() {
  if (await prisma.dataFix.findUnique({ where: { name: FIX_NAME } })) return { relabelled: 0, retired: 0, skipped: true };
  const checkedAt = new Date('2026-11-23T12:00:00Z');
  let relabelled = 0;
  let retired = 0;
  for (const [name, bottleFormat] of RETIRE) {
    const r = await prisma.sku.updateMany({ where: { name, bottleFormat, retiredAt: null }, data: { retiredAt: new Date() } });
    retired += r.count;
  }
  for (const [name, from, to, { retail, scale, slug, note }] of RELABELS) {
    const sku = await prisma.sku.findFirst({ where: { name, bottleFormat: from, retiredAt: null } });
    if (!sku) continue;
    if (await prisma.sku.findFirst({ where: { name, bottleFormat: to } })) continue;
    const data = { bottleFormat: to, retailPriceNote: `23 Nov 2026: ${note}` };
    const bulk = sku.casePriceZAR != null ? Number(sku.casePriceZAR) : null;
    if (retail != null) {
      Object.assign(data, { retailPriceZAR: retail, retailPriceSource: 'VERIFIED', retailPriceCheckedAt: checkedAt });
      // A group price at least 10% under the shelf for food bought singly;
      // never higher than it was.
      if (sku.unitsPerCase === 1) {
        const group = round2(retail * 0.9);
        if (bulk == null || group < bulk) data.casePriceZAR = group;
      }
    } else if (scale != null) {
      if (sku.retailPriceZAR != null) Object.assign(data, { retailPriceZAR: round2(Number(sku.retailPriceZAR) * scale), retailPriceSource: 'ESTIMATE' });
    }
    if (slug && !sku.imageUrl) data.imageUrl = photoUrl(slug);
    await prisma.sku.update({ where: { id: sku.id }, data });
    relabelled += 1;
  }
  await prisma.dataFix.create({ data: { name: FIX_NAME } });
  console.log(`Shop sizes: ${relabelled} relabelled, ${retired} retired.`);
  return { relabelled, retired, skipped: false };
}
