// Case sizes as the shops sell them (founder, 24 Nov 2026: "check the sizes
// and per pack amounts"). Checked on the shops' own listings, 24 Nov 2026:
// - Valpre Still 1.5L: Pick n Pay sells it by 12 (R21.99 a bottle).
// - Valpre Sparkling 1L: Makro Business 12 x 1L R195.95; the bulk source
//   (Norman Goodfellow's R149) is also a 12.
// - Tsitsikamma 1.5L and 1L: 6-packs (Checkers, Shoprite).
// - Bonaqua Still 1.5L: sold singly (R17.99); 1.5L water is packed by 6.
// - Monin syrups 700ml: boxes of 6.
// - Sol quart: 12 to a crate, like every quart.
// (Schweppes 1L is 12 and Hennessy VS 12 x 750ml, as already listed.)
// A case changes size; the price of one bottle does not, except where the
// shop's own case price was read. Runs once.
import prisma from '../config/db.js';

export const FIX_NAME = 'case-sizes-2026-11-24';
const CHECKED = new Date('2026-11-24T12:00:00Z');
const r2 = (n) => Math.round(n * 100) / 100;

// [name, bottleFormat, from, to, { bulk?, retail?, note? }]
export const CASE_SIZES = [
  ['Valpre Still Water', 'Bottle (1.5L)', 24, 12, { bulk: 169, retail: 263.88, note: "Pick n Pay sells Valpré Still 1.5L by 12, R21.99 a bottle. Bulk: Norman Goodfellow's 12 x 1.5L R169." }],
  ['Valpre Sparkling Water', 'Bottle (1L)', 24, 12, { bulk: 149, retail: 195.95, note: "Makro Business, Valpré Sparkling 12 x 1L R195.95. Bulk: Norman Goodfellow's 12 x 1L R149." }],
  ['Tsitsikamma Sparkling Water', 'Bottle (1.5L)', 24, 6, {}],
  ['Tsitsikamma Still Water', 'Bottle (1.5L)', 24, 6, {}],
  ['Tsitsikamma Sparkling Water', 'Bottle (1L)', 24, 6, {}],
  ['Tsitsikamma Still Water', 'Bottle (1L)', 24, 6, {}],
  ['Bonaqua Still Water', 'Bottle (1.5L)', 24, 6, {}],
  ['Sol', 'Quart (640ml)', 24, 12, {}],
];
const MONIN = /^Monin /;

export async function fixCaseSizes() {
  if (await prisma.dataFix.findUnique({ where: { name: FIX_NAME } })) return { changed: 0, skipped: true };
  const list = [...CASE_SIZES];
  const monin = await prisma.sku.findMany({ where: { name: { startsWith: 'Monin ' }, unitsPerCase: 12, retiredAt: null }, select: { name: true, bottleFormat: true } });
  for (const m of monin) if (MONIN.test(m.name)) list.push([m.name, m.bottleFormat, 12, 6, {}]);
  let changed = 0;
  for (const [name, fmt, from, to, { bulk, retail, note }] of list) {
    const row = await prisma.sku.findFirst({ where: { name, bottleFormat: fmt, unitsPerCase: from, retiredAt: null } });
    if (!row) continue;
    const scale = to / from;
    const data = { unitsPerCase: to };
    data.casePriceZAR = bulk != null ? bulk : row.casePriceZAR == null ? null : r2(Number(row.casePriceZAR) * scale);
    if (retail != null) Object.assign(data, { retailPriceZAR: retail, retailPriceSource: 'VERIFIED', retailPriceCheckedAt: CHECKED, retailPriceNote: `24 Nov 2026 (regular price): ${note}` });
    else if (row.retailPriceZAR != null) data.retailPriceZAR = r2(Number(row.retailPriceZAR) * scale);
    await prisma.sku.update({ where: { id: row.id }, data });
    changed += 1;
  }
  await prisma.dataFix.create({ data: { name: FIX_NAME } });
  if (changed) console.log(`Case sizes: ${changed} product(s) now packed as the shops sell them.`);
  return { changed, skipped: false };
}
