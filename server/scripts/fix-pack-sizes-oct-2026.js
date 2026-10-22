// October 2026 catalogue corrections, asked for by the founder after the
// price check against Ultra, Prestons, Makro, Shoprite and Boxer.
//
// 1. PACK SIZES. The catalogue was first built by a different AI and got
//    several sizes wrong. The founder's rules:
//    - Beer/cider cans are 500ml by default. Any can row on another size
//      (330ml, 440ml) moves to Can (500ml), with these real-size exceptions:
//        - Windhoek Draught and every Hunter's cider: 440ml cans (Checkers,
//          Ultra listings; founder confirmed, Oct 2026).
//        - Corona: 410ml can, confirmed from a real can photo (see
//          fix-beer-quart-formats.js) — left alone.
//    - "Dumpy (340ml)" was always meant to be the 330ml dumpy. South African
//      24-packs are sold as 24 x 330ml (Ultra, Woolworths, liquor.co.za).
//    - Heineken's quart is 650ml (heineken.com/za) — fixed in
//      fix-beer-quart-formats.js, alongside the other quart sizes.
//    A row is moved, never duplicated, so its price, photo and order history
//    stay attached. If a product somehow already has a row at the target
//    size, the move is skipped and logged for a person to merge by hand.
//
// 2. PRICES. Shop prices read off October 2026 catalogues, each naming the
//    shop and the dates, so they meet the VERIFIED rule in
//    docs/pricing/README.md. Only exact matches (same product, same size,
//    same pack) are recorded.
//    Founder's rule for prices that are too low: raise by R40 a bottle, as
//    long as we stay at or below the cheapest shop. Jameson Original was
//    R268.80 a bottle against R349.99 at Prestons, so it goes to R308.80.
//    The new price is written as a fixed number, not "current + R40", so
//    re-running on every boot never keeps stacking the increase.
//    Hennessy VS, JW Gold and Amarula are dearer than the shop; the founder
//    chose to leave their prices as they are for now (Oct 2026).
//
// Idempotent — safe to run on every boot.
import prisma from '../config/db.js';

const CAN_CATEGORIES = ['BEER', 'CIDER_RTD'];
const CAN_DEFAULT = 'Can (500ml)';
const CAN_440 = 'Can (440ml)';
const DUMPY_FROM = 'Dumpy (340ml)';
const DUMPY_TO = 'Dumpy (330ml)';

const ROW_SELECT = { id: true, name: true, bottleFormat: true };

// The correct can size for a product, or null to leave it untouched.
function canTargetFor(name) {
  if (name === 'Corona') return null;
  if (name === 'Windhoek Draught' || name.startsWith("Hunter's")) return CAN_440;
  return CAN_DEFAULT;
}

async function moveFormat(row, to) {
  const clash = await prisma.sku.findFirst({
    where: { name: row.name, bottleFormat: to },
    select: { id: true },
  });
  if (clash) {
    console.warn(`Pack size fix: "${row.name}" already has a ${to} row; ${row.bottleFormat} left for a person to merge.`);
    return 0;
  }
  await prisma.sku.update({ where: { id: row.id }, data: { bottleFormat: to } });
  return 1;
}

export async function fixPackSizes() {
  let changed = 0;

  const dumpies = await prisma.sku.findMany({ where: { bottleFormat: DUMPY_FROM }, select: ROW_SELECT });
  for (const row of dumpies) changed += await moveFormat(row, DUMPY_TO);

  const cans = await prisma.sku.findMany({
    where: { category: { in: CAN_CATEGORIES }, bottleFormat: { startsWith: 'Can (' } },
    select: ROW_SELECT,
  });
  for (const row of cans) {
    const target = canTargetFor(row.name);
    if (!target || row.bottleFormat === target) continue;
    changed += await moveFormat(row, target);
  }

  if (changed > 0) console.log(`Pack size fix: ${changed} row(s) corrected.`);
  return changed;
}

const CHECKED_AT = new Date('2026-10-22T00:00:00.000Z');

// caseRetail = the shop's price for the same number of units as our case.
// units guards the match: if the row's unitsPerCase differs, it is skipped
// rather than given a retail figure for a different pack.
const OCTOBER_2026_PRICES = [
  { name: 'Hennessy VS', bottleFormat: '750ml Bottle', units: 12, caseRetail: 5999.88,
    note: 'Ultra Liquors broadsheet 1-15 Oct 2026: R499.99 per 750ml x 12.' },
  { name: 'Johnnie Walker Gold Label Reserve', bottleFormat: '750ml Bottle', units: 12, caseRetail: 7199.88,
    note: 'Ultra Liquors broadsheet 16-31 Oct 2026: R599.99 per 750ml x 12.' },
  { name: 'Johnnie Walker Red Label', bottleFormat: '750ml Bottle', units: 12, caseRetail: 2879.88,
    note: 'Ultra Liquors broadsheets 1-15 and 16-31 Oct 2026: R239.99 per 750ml x 12.' },
  { name: 'Johnnie Walker Black Label', bottleFormat: '750ml Bottle', units: 12, caseRetail: 4439.88,
    note: 'Ultra Liquors broadsheet 1-15 Oct 2026: R369.99 per 750ml x 12.' },
  { name: 'Amarula Original Cream', bottleFormat: '750ml Bottle', units: 12, caseRetail: 1859.88,
    note: 'Prestons Liquors catalogue 1-21 Oct 2026: R154.99 per 750ml x 12.' },
  // Founder's R40 rule: R3,225.60 + (R40 x 12) = R3,705.60, still under Prestons.
  // Pallet keeps the existing 57.5-case ratio (R185,472 / R3,225.60).
  { name: 'Jameson Original Irish', bottleFormat: '750ml Bottle', units: 12, caseRetail: 4199.88,
    casePriceZAR: 3705.60, palletPriceZAR: 213072.00,
    note: 'Prestons Liquors catalogue 1-21 Oct 2026: R349.99 per 750ml x 12. Our price raised R40 a bottle (founder, Oct 2026) as it was 23% under the shop.' },
  { name: 'Castle Lite', bottleFormat: 'Can (500ml)', units: 24, caseRetail: 339.99,
    note: 'Ultra Liquors broadsheet 16-31 Oct 2026: Castle Lite 24 x 500ml cans R339.99.' },
  { name: 'Heineken', bottleFormat: 'Dumpy (330ml)', units: 24, caseRetail: 339.99,
    note: 'Ultra Liquors broadsheet 16-31 Oct 2026: Heineken 24 x 330ml bottles R339.99.' },
  { name: 'Heineken', bottleFormat: 'Can (500ml)', units: 24, caseRetail: 399.00,
    note: 'Makro online listing, seen 22 Oct 2026: Heineken 24 x 500ml cans R399 (down from R459).' },
  { name: 'Savanna Dry', bottleFormat: 'Dumpy (330ml)', units: 24, caseRetail: 379.99,
    note: 'Ultra Liquors broadsheet 16-31 Oct 2026: Savanna 24 x 330ml bottles R379.99.' },
];

export async function applyOctober2026Prices() {
  let updated = 0;
  for (const item of OCTOBER_2026_PRICES) {
    const row = await prisma.sku.findFirst({
      where: { name: item.name, bottleFormat: item.bottleFormat },
      select: { id: true, unitsPerCase: true },
    });
    if (!row) continue;
    if (row.unitsPerCase !== item.units) {
      console.warn(`October prices: "${item.name}" ${item.bottleFormat} has ${row.unitsPerCase} per case, not ${item.units}; skipped.`);
      continue;
    }
    await prisma.sku.update({
      where: { id: row.id },
      data: {
        retailPriceZAR: item.caseRetail,
        retailPriceSource: 'VERIFIED',
        retailPriceCheckedAt: CHECKED_AT,
        retailPriceNote: item.note,
        ...(item.casePriceZAR != null && { casePriceZAR: item.casePriceZAR }),
        ...(item.palletPriceZAR != null && { palletPriceZAR: item.palletPriceZAR }),
      },
    });
    updated++;
  }
  if (updated > 0) console.log(`October 2026 prices: ${updated} row(s) updated.`);
  return updated;
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  fixPackSizes()
    .then(() => applyOctober2026Prices())
    .then((count) => console.log(`Done. ${count} price row(s) updated.`))
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
