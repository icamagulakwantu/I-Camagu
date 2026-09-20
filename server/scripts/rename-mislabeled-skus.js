// A few names from split-bundled-flavour-skus.js turned out to be wrong
// once a real product photo arrived, distinct from a bundled name (fixed by
// splitting) or a fictional flavour (fixed by remove-nonexistent-skus.js) —
// here the row is a real product, just filed under the wrong name.
//
// - "Strongbow Gold" / "Strongbow Apple" assumed the bundled "Gold/Apple"
//   was two flavours, Gold and Apple. Real bottles show it's one flavour,
//   "Gold Apple" — the actual second flavour is "Red Berries".
// - "Smirnoff Spin" was never a real Smirnoff product — no photo ever
//   showed one, same class of error as Bernini Ruby or Windhoek Lite. Real
//   cans show the range is "Storm", with two flavours: Pine Twist and
//   Citrus. "Smirnoff Storm" (bare, ambiguous which flavour) is renamed to
//   match, and "Spin" becomes the flavour that was missing.
//
// Idempotent — renaming a row that's already been renamed matches nothing.
import prisma from '../config/db.js';

const RENAMES = [
  { from: 'Strongbow Gold', to: 'Strongbow Gold Apple' },
  { from: 'Strongbow Apple', to: 'Strongbow Red Berries' },
  { from: 'Smirnoff Storm', to: 'Smirnoff Storm Citrus' },
  { from: 'Smirnoff Spin', to: 'Smirnoff Storm Pine Twist' },
  // Real bottle/can photos show the actual label is "Dry Apple", not bare
  // "Apple" — same pattern as Strongbow/Smirnoff above.
  { from: 'Flying Fish Apple', to: 'Flying Fish Dry Apple' },
  // The real bottle label reads "Gordon's Pink Berry", not the generic
  // "Gordons Premium Pink" seeded before a photo arrived.
  { from: 'Gordons Premium Pink', to: 'Gordons Pink Berry' },
];

export async function renameMislabeledSkus() {
  let renamed = 0;
  for (const { from, to } of RENAMES) {
    const { count } = await prisma.sku.updateMany({ where: { name: from }, data: { name: to } });
    renamed += count;
  }
  if (renamed > 0) console.log(`Mislabeled SKU rename: ${renamed} row(s) renamed.`);
  return renamed;
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  renameMislabeledSkus()
    .then((count) => console.log(`Done. ${count} row(s) renamed.`))
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
