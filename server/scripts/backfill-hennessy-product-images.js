// Corrects the three Hennessy product photos using official Hennessy product packshots.
// Narrow and idempotent: only imageUrl is changed, never price, format, or stock data.
// These official product images show the correct VS / VSOP / XO variant without
// the black frame and tiny bottle crop found in the previous catalogue photos.
import prisma from '../config/db.js';

export const HENNESSY_PRODUCT_IMAGES = {
  'Hennessy VS': 'https://fr.hennessy.com/sites/hennessy_fr/files/2024-08/hny_vs_packshot_2000x2000.jpg',
  'Hennessy VSOP': 'https://www.hennessy.com/sites/hennessy/files/2023-04/HENNESSY-VSOP-BOTTLE.png',
  'Hennessy XO': 'https://www.hennessy.com/sites/hennessy/files/2025-10/2212_xo_bottle_front_2000x2000.jpg',
};

export async function backfillHennessyProductImages() {
  let updated = 0;
  for (const [name, imageUrl] of Object.entries(HENNESSY_PRODUCT_IMAGES)) {
    const result = await prisma.sku.updateMany({
      where: { name, NOT: { imageUrl } },
      data: { imageUrl },
    });
    updated += result.count;
  }
  if (updated) console.log(`Hennessy official product images: ${updated} SKU row(s) corrected.`);
  return updated;
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  backfillHennessyProductImages()
    .then((count) => console.log(`Done. ${count} SKU row(s) updated.`))
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
