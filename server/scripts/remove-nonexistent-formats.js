// Like remove-nonexistent-skus.js, but scoped to one bottleFormat of a
// product rather than the whole name — for a product that's real, and
// correctly catalogued in some formats, but was wrongly given an extra
// pack size that doesn't actually exist.
//
// Flying Fish Lemon, Flying Fish Apple and Savanna Angry Lemon were each
// given a Can (500ml) row when the founder's original bundled data was
// split/added — the founder confirmed none of the three actually ships in
// a can, only bottles. Removed entirely rather than left photo-less, same
// reasoning as remove-nonexistent-skus.js: there's no real product to
// catalogue at that format.
//
// Idempotent — deleteMany on a (name, bottleFormat) pair that's already
// gone is a no-op.
import prisma from '../config/db.js';

const NONEXISTENT_FORMATS = [
  { name: 'Flying Fish Lemon', bottleFormat: 'Can (500ml)' },
  { name: 'Flying Fish Apple', bottleFormat: 'Can (500ml)' },
  { name: 'Savanna Angry Lemon', bottleFormat: 'Can (500ml)' },
];

export async function removeNonexistentFormats() {
  let removed = 0;
  for (const { name, bottleFormat } of NONEXISTENT_FORMATS) {
    const { count } = await prisma.sku.deleteMany({ where: { name, bottleFormat } });
    removed += count;
  }
  if (removed > 0) console.log(`Nonexistent format removal: ${removed} row(s) deleted.`);
  return removed;
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  removeNonexistentFormats()
    .then((count) => console.log(`Done. ${count} row(s) deleted.`))
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
