// Sku rows for products that turned out not to actually exist — caught
// after the fact, usually once a real product photo showed the true
// flavour range didn't include one of the names originally catalogued.
// Unlike clear-broken-brand-photos.js (which only clears a bad imageUrl,
// keeping the row), these rows are removed entirely: there's no real
// product to catalogue at all.
//
// Idempotent — deleteMany on a name that's already gone is a no-op.
import prisma from '../config/db.js';

const NONEXISTENT_SKU_NAMES = [
  // Correction: Bernini's third flavour turned out to be real after all — a
  // photo showed it, just under its actual name "Ruby Berry", not the bare
  // "Ruby" this list previously (and wrongly) called fictional. See
  // backfill-founder-sourced-skus.js, which restores it under the right
  // name. This entry stays only so a stray "Bernini Ruby" row — the wrong
  // name — never lingers if something re-creates it.
  'Bernini Ruby',
];

export async function removeNonexistentSkus() {
  const { count } = await prisma.sku.deleteMany({
    where: { name: { in: NONEXISTENT_SKU_NAMES } },
  });
  if (count > 0) console.log(`Nonexistent SKU removal: ${count} row(s) deleted.`);
  return count;
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  removeNonexistentSkus()
    .then((count) => console.log(`Done. ${count} row(s) deleted.`))
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
