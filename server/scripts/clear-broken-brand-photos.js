// Clears imageUrl back to null for Sku rows whose photo turned out, on
// closer look, to be a plain text/wordmark logo card with no bottle in it
// at all, or — Skyy Vodka Original — a photo of someone's home bookshelf
// that isn't a product photo at all. Showing nothing (the app's generic
// placeholder icon) is better than showing one of these.
//
// Idempotent — only ever touches these specific known names, and setting
// an already-null imageUrl to null again is a no-op.
import prisma from '../config/db.js';

const BROKEN_PHOTO_NAMES = [
  // 'Brutal Fruit Ruby/Litchi' and 'Bernini Classic/Blush/Ruby' themselves no
  // longer exist — both split into per-flavour rows
  // (split-bundled-flavour-skus.js), which now have their own real photos.
  "Redd's Berry/Orig/Green",
  "Redd's MXD Pine/Guarana",
  'Three Ships 5 Year Old',
  'Cointreau Orange Liqueur',
  '4th Street Sweet Red/White',
  '4th Street Sweet Red/Rose',
  'Amarula Original Cream',
  'Amarula Ethiopian Coffee',
  'Count Pushkin Vodka',
  'Skyy Vodka Original',
];

export async function clearBrokenBrandPhotos() {
  const { count } = await prisma.sku.updateMany({
    where: { name: { in: BROKEN_PHOTO_NAMES } },
    data: { imageUrl: null },
  });
  if (count > 0) {
    console.log(`Broken brand photo clear: ${count} row(s) reset to no image.`);
  }
  return count;
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  clearBrokenBrandPhotos()
    .then((count) => console.log(`Done. ${count} row(s) updated.`))
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
