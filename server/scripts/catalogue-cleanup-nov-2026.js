// Catalogue clean-up requested by the founder on 12 November 2026, after a
// full review of the live catalogue. Idempotent: every step checks the
// current value first, so it is safe on every boot.
//
// 1. Products that are not sold are retired: deleted when nothing points at
//    them, otherwise hidden (retiredAt) so existing orders keep their rows.
//    - The 250ml soft-drink cans: the founder sells the 300ml bottles.
//    - Hunter's Chilled: listed twice under different packs and not stocked.
// 2. Extreme is an alcoholic spirit cooler, not an energy drink: it moves to
//    ciders & coolers, takes its on-pack name, and its "Dumpy (500ml)" row is
//    the 330ml dumpy (as backfill-hennessy-product-images.js intended).
// 3. Kopparberg's "Dumpy (500ml)" rows are 500ml bottles, so they are named so.
// 4. Images that show a different pack from the row they sit on are removed
//    (only when the row still has that exact wrong image), so the Store shows
//    its placeholder until the right photo arrives, instead of a can on a
//    bottle row or a dumpy on a quart row.
// 5. Prices for the 300ml soft-drink bottles and the Black Label dumpy, from
//    named retailer listings checked on 12 November 2026. Member price is 5%
//    below retail, the founder's minimum saving target. Set only while the
//    row has no price, so a later supplier price is never overwritten.
import prisma from '../config/db.js';

const CHECKED_AT = new Date('2026-11-12T12:00:00Z');

const RETIRE = [
  { name: 'Coca-Cola', bottleFormat: 'Can (250ml)' },
  { name: 'Fanta Orange', bottleFormat: 'Can (250ml)' },
  { name: 'Sprite', bottleFormat: 'Can (250ml)' },
  { name: 'Stoney Ginger Beer', bottleFormat: 'Can (250ml)' },
  { name: "Hunter's Chilled", bottleFormat: 'Can (440ml)' },
  { name: "Hunter's Chilled", bottleFormat: 'Dumpy (330ml)' },
];

const RENAMES = [
  { from: { name: 'Extreme Energy', bottleFormat: 'Can (500ml)' }, to: { name: 'Extreme Guarana', bottleFormat: 'Can (500ml)', category: 'CIDER_RTD', productType: 'ALCOHOL' } },
  { from: { name: 'Extreme Energy', bottleFormat: 'Dumpy (500ml)' }, to: { name: 'Extreme Guarana', bottleFormat: 'Dumpy (330ml)', category: 'CIDER_RTD', productType: 'ALCOHOL' } },
  { from: { name: 'Kopparberg Mixed Fruit', bottleFormat: 'Dumpy (500ml)' }, to: { bottleFormat: 'Bottle (500ml)' } },
  { from: { name: 'Kopparberg Pear', bottleFormat: 'Dumpy (500ml)' }, to: { bottleFormat: 'Bottle (500ml)' } },
  { from: { name: 'Kopparberg Raspberry', bottleFormat: 'Dumpy (500ml)' }, to: { bottleFormat: 'Bottle (500ml)' } },
  { from: { name: 'Kopparberg Strawberry & Lime', bottleFormat: 'Dumpy (500ml)' }, to: { bottleFormat: 'Bottle (500ml)' } },
];

const brand = (file) => `/images/brands/${file}`;

// Each image below shows a different pack from the row it is on.
const WRONG_IMAGES = [
  { name: 'Flying Fish Dry Apple', bottleFormat: 'Quart (660ml)', imageUrl: brand('flying-fish-dry-apple.png') },
  { name: 'Bernini Ruby Berry', bottleFormat: 'Can (500ml)', imageUrl: brand('bernini-ruby-berry.png') },
  { name: 'Breezer Blueberry', bottleFormat: 'Can (500ml)', imageUrl: brand('breezer-blueberry.png') },
  { name: 'Brutal Fruit Strawberry Rouge', bottleFormat: 'Quart (750ml)', imageUrl: brand('brutal-fruit-strawberry-rouge.png') },
  { name: "Hunter's Dry", bottleFormat: 'Quart (750ml)', imageUrl: brand('hunters-dry.png') },
  { name: 'Strongbow Gold Apple', bottleFormat: 'Quart (750ml)', imageUrl: brand('strongbow-gold-apple.png') },
  { name: 'Strongbow Red Berries', bottleFormat: 'Quart (750ml)', imageUrl: brand('strongbow-red-berries.png') },
  { name: 'Kopparberg Mixed Fruit', bottleFormat: 'Bottle (500ml)', imageUrl: brand('kopparberg-mixed-fruit-can.png') },
  { name: 'Kopparberg Raspberry', bottleFormat: 'Can (500ml)', imageUrl: brand('kopparberg-raspberry.png') },
  { name: 'Chillers Punch Caribbean Chaos', bottleFormat: 'Dumpy (500ml)', imageUrl: brand('chillers-punch-caribbean-chaos.png') },
  { name: 'Chillers Punch Milano Spritz', bottleFormat: 'Dumpy (500ml)', imageUrl: brand('chillers-punch-milano-spritz.png') },
  { name: 'Chillers Punch Peach & Mango', bottleFormat: 'Dumpy (500ml)', imageUrl: brand('chillers-punch-peach-mango.png') },
  { name: 'Chillers Punch Tequila Sunrise (Zero Alcohol)', bottleFormat: 'Dumpy (500ml)', imageUrl: brand('chillers-punch-tequila-sunrise-zero.png') },
  // The Bonaqua photo is a case of 24 x 500ml, so it stays on the 500ml row only.
  { name: 'Bonaqua Still Water', bottleFormat: 'Bottle (1L)', imageUrl: brand('bonaqua-still-water.png') },
  { name: 'Bonaqua Still Water', bottleFormat: 'Bottle (1.5L)', imageUrl: brand('bonaqua-still-water.png') },
];

const memberPrice = (retail) => Math.round(retail * 0.95 * 100) / 100;

const PRICES = [
  {
    name: 'Black Label', bottleFormat: 'Dumpy (330ml)', retail: 329.0, source: 'VERIFIED',
    note: 'Makro, Carling Black Label NRBs 24 x 330ml, R329.00 (makro.co.za product 000000000000392104_CS), checked 12 Nov 2026. Checkers lists R294.99-R334.99. Member price 5% below Makro.',
  },
  {
    name: 'Coca-Cola', bottleFormat: 'Bottle (300ml)', retail: 189.95, source: 'VERIFIED',
    note: 'Makro, Coca-Cola Original Taste plastic bottles 24 x 300ml, R189.95, checked 12 Nov 2026. Member price 5% below Makro.',
  },
  {
    name: 'Fanta Orange', bottleFormat: 'Bottle (300ml)', retail: 189.99, source: 'VERIFIED',
    note: 'Shoprite, Fanta Orange 24 x 300ml, R189.99 regular price (R179.99 on promotion), checked 12 Nov 2026. Member price 5% below the regular price.',
  },
  {
    name: 'Sprite', bottleFormat: 'Bottle (300ml)', retail: 189.95, source: 'ESTIMATE',
    note: 'No 24 x 300ml Sprite pack listing found on 12 Nov 2026; matched to the Coca-Cola and Fanta 24 x 300ml packs (R189.95-R189.99). Shoprite single bottle R11.99. Verify before showing a saving.',
  },
  {
    name: 'Stoney Ginger Beer', bottleFormat: 'Bottle (300ml)', retail: 219.99, source: 'VERIFIED',
    note: 'Shoprite, Stoney Classic Ginger Beer 24 x 300ml, R219.99, checked 12 Nov 2026. Member price 5% below Shoprite.',
  },
];

async function retireProducts() {
  let deleted = 0;
  let retired = 0;
  for (const { name, bottleFormat } of RETIRE) {
    const rows = await prisma.sku.findMany({
      where: { name, bottleFormat },
      select: { id: true, retiredAt: true, _count: { select: { basketItems: true, costItems: true } } },
    });
    for (const row of rows) {
      if (row._count.basketItems === 0 && row._count.costItems === 0) {
        deleted += (await prisma.sku.deleteMany({ where: { id: row.id } })).count;
      } else if (!row.retiredAt) {
        await prisma.sku.update({ where: { id: row.id }, data: { retiredAt: new Date() } });
        retired += 1;
      }
    }
  }
  return { deleted, retired };
}

async function renameProducts() {
  let renamed = 0;
  for (const { from, to } of RENAMES) {
    const row = await prisma.sku.findFirst({ where: from, select: { id: true } });
    if (!row) continue;
    const target = { name: to.name || from.name, bottleFormat: to.bottleFormat || from.bottleFormat };
    const clash = await prisma.sku.findFirst({ where: { ...target, NOT: { id: row.id } }, select: { id: true } });
    if (clash) {
      console.warn(`Catalogue clean-up: "${target.name}" / "${target.bottleFormat}" already exists; left "${from.name}" / "${from.bottleFormat}" for review.`);
      continue;
    }
    await prisma.sku.update({ where: { id: row.id }, data: to });
    renamed += 1;
  }
  return renamed;
}

async function clearWrongImages() {
  let cleared = 0;
  for (const { name, bottleFormat, imageUrl } of WRONG_IMAGES) {
    cleared += (await prisma.sku.updateMany({ where: { name, bottleFormat, imageUrl }, data: { imageUrl: null } })).count;
  }
  return cleared;
}

async function setPrices() {
  let priced = 0;
  for (const { name, bottleFormat, retail, source, note } of PRICES) {
    priced += (await prisma.sku.updateMany({
      where: { name, bottleFormat, casePriceZAR: null },
      data: {
        casePriceZAR: memberPrice(retail),
        retailPriceZAR: retail,
        retailPriceSource: source,
        retailPriceCheckedAt: CHECKED_AT,
        retailPriceNote: note,
      },
    })).count;
  }
  return priced;
}

export async function cleanUpCatalogueNov2026() {
  const { deleted, retired } = await retireProducts();
  const renamed = await renameProducts();
  const cleared = await clearWrongImages();
  const priced = await setPrices();
  const total = deleted + retired + renamed + cleared + priced;
  if (total) {
    console.log(`Catalogue clean-up (Nov 2026): ${deleted} deleted, ${retired} retired, ${renamed} renamed, ${cleared} wrong image(s) removed, ${priced} priced.`);
  }
  return total;
}

export const __test__ = { RETIRE, RENAMES, WRONG_IMAGES, PRICES, memberPrice };

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  cleanUpCatalogueNov2026()
    .then((count) => console.log(`Done. ${count} change(s).`))
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
