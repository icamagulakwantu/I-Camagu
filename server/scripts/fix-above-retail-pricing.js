// Eight single-unit grocery/household items (unitsPerCase: 1, so
// casePriceZAR is a genuine per-unit price, not a case total) were priced
// ABOVE their own researched retail comparable — the opposite of iCamagu's
// whole point. The frontend already hides the "Save Rxx" badge whenever
// this happens (Store.jsx, Basket.jsx), so no customer ever saw a false
// claim, but the underlying price was still wrong.
//
// No real supplier cost exists for these — the founder asked for a fix
// based on what the catalogue itself already shows, not a renegotiated
// quote. Every other single-unit item in the catalogue that undercuts its
// own verified retail price does so by roughly 3.5%-18% (Potatoes 3.5%,
// Tarpaulin Sail 6.7%, Boerewors 14.4%, Beef Mince 17.9%) — these eight are
// set to a flat 10% below their existing retailPriceZAR, the middle of
// that observed range, as an interim correction. This is NOT a negotiated
// bulk cost; it's a stopgap so the platform stops charging more than a
// shop for these eight, until the founder has a real supplier price to
// enter instead.
//
// Idempotent — only ever overwrites these eight names' casePriceZAR to the
// same computed value.
import prisma from '../config/db.js';

const DISCOUNT_FROM_RETAIL = 0.10;

const ABOVE_RETAIL_ITEMS = [
  '25L Water Container',
  'Cooking Oil',
  'Plain Grey Blanket',
  'Sugar',
  'White Blanket with Black Stripes',
  'Brown Bread Loaf',
  'Instant Coffee',
  'Onions',
];

export async function fixAboveRetailPricing() {
  let updated = 0;
  const rows = await prisma.sku.findMany({
    where: { name: { in: ABOVE_RETAIL_ITEMS }, retailPriceZAR: { not: null } },
  });
  for (const row of rows) {
    const retail = Number(row.retailPriceZAR);
    const newPrice = Math.round(retail * (1 - DISCOUNT_FROM_RETAIL) * 100) / 100;
    const currentPrice = row.casePriceZAR == null ? null : Number(row.casePriceZAR);
    if (currentPrice === newPrice) continue;
    await prisma.sku.update({ where: { id: row.id }, data: { casePriceZAR: newPrice } });
    updated++;
  }
  if (updated > 0) console.log(`Above-retail pricing fix: ${updated} row(s) corrected.`);
  return updated;
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  fixAboveRetailPricing()
    .then((count) => console.log(`Done. ${count} row(s) updated.`))
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
