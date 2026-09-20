// Clears imageUrl back to null for Sku rows whose photo turned out, on
// closer look, to be a plain text/wordmark logo card with no bottle in it
// at all. Showing nothing (the app's generic placeholder icon) is better
// than showing one of these.
//
// Idempotent — only ever touches these specific known names, and setting
// an already-null imageUrl to null again is a no-op.
import prisma from '../config/db.js';

const BROKEN_PHOTO_NAMES = [
  // 'Brutal Fruit Ruby/Litchi', 'Bernini Classic/Blush/Ruby', "Redd's
  // Berry/Orig/Green", "Redd's MXD Pine/Guarana", '4th Street Sweet
  // Red/White' and '4th Street Sweet Red/Rose' themselves no longer exist —
  // all split into per-flavour rows (split-bundled-flavour-skus.js), which
  // now have their own real photos.
  //
  // Skyy Vodka Original, Three Ships 5 Year Old and Amarula Original Cream
  // used to be here too — each had a bad old photo (Skyy's was literally
  // someone's home bookshelf). Real bottle photos have since arrived for
  // all three and are wired in backfill-extracted-brand-photos.js; leaving
  // any of them here would silently wipe that new photo back to null on
  // every boot, the same bug once found with Count Pushkin Vodka.
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
