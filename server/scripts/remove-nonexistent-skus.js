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
  // The founder confirmed Peach Schnapps (Relic) is the only peach
  // schnapps iCamagu actually carries — the unbranded "Generic" row was
  // never a real product, and "Peach Schnapps (Butlers)" is dropped too
  // rather than kept alongside Relic as a second real option.
  'Peach Schnapps Generic',
  'Peach Schnapps (Butlers)',
  // Redundant with the two real branded rows already photographed and
  // wired — 'Blue Curacao (Butlers)' and 'Blue Curacao (Peddler's)'. This
  // unbranded placeholder predates both and was never a real product on
  // its own.
  'Blue Curacao Generic',
  // Same pattern — redundant with 'Strawberry Liqueur (Butlers)', already
  // photographed and wired.
  'Strawberry Liqueur Generic',
  // Founder confirmed this unbranded placeholder isn't a real product
  // iCamagu carries — same class as the other Generic removals above.
  'Sambuca Generic White',
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
