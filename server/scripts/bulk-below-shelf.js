// A bulk price is always below the shop's shelf price (founder, 23 Nov 2026:
// "they should be lower than shelf price"). Runs at every start, after the
// weekly price checks: any live product whose shelf price was read off a
// shop (VERIFIED) and whose bulk price is not at least 5% below it (the
// founder's minimum saving) is brought down to 5% below. Prices only go
// down. Estimated shelf prices are left alone: nobody checked them, so they
// cannot move a real price.
import prisma from '../config/db.js';

export const MIN_SAVING = 0.05;

export function cappedPrice(bulk, shelf) {
  if (bulk == null || shelf == null) return null;
  const cap = Math.floor(Number(shelf) * (1 - MIN_SAVING) * 100) / 100;
  return Number(bulk) > cap ? cap : null;
}

export async function keepBulkBelowShelf() {
  const rows = await prisma.sku.findMany({
    where: { retiredAt: null, retailPriceSource: 'VERIFIED', casePriceZAR: { not: null }, retailPriceZAR: { not: null } },
    select: { id: true, name: true, bottleFormat: true, casePriceZAR: true, retailPriceZAR: true },
  });
  const changed = [];
  for (const row of rows) {
    const next = cappedPrice(row.casePriceZAR, row.retailPriceZAR);
    if (next == null) continue;
    await prisma.sku.update({ where: { id: row.id }, data: { casePriceZAR: next } });
    changed.push(`${row.name} (${row.bottleFormat}): R${Number(row.casePriceZAR)} → R${next}`);
  }
  if (changed.length) console.log(`Bulk below shelf: ${changed.length} price(s) lowered: ${changed.join('; ')}`);
  return changed;
}
