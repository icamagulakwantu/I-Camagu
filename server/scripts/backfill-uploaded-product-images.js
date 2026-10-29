// Idempotent image repair for verified assets committed under public/images/brands.
// Only fills blank imageUrl fields; never replaces existing images or changes prices.
import prisma from '../config/db.js';

const VERIFIED_IMAGE_MAPPINGS = [
  // The committed assets were visually checked: images (13) is a goat photo.
  { names: ['Goat — Inkabi (male)', 'Goat - Inkabi (male)', 'Goat — Imazi (female)', 'Goat - Imazi (female)'], image: '/images/brands/images%20(13).jpeg' },
  // Nguni-type cattle photo. This is a species-level illustrative image.
  { names: ['Inkomo / Cow — Inkabi (male)', 'Inkomo / Cow - Inkabi (male)', 'Inkomo / Cow — Imazi (female)', 'Inkomo / Cow - Imazi (female)'], image: '/images/brands/iStock-1292580655.jpg' },
  // Sheep rows: male uses the ram photo; female uses a wool-sheep photo.
  { names: ['Sheep — Inkabi (male)', 'Sheep - Inkabi (male)'], image: '/images/brands/images%20(11).jpeg' },
  { names: ['Sheep — Imazi (female)', 'Sheep - Imazi (female)'], image: '/images/brands/images%20(12).jpeg' },
  // Exact committed packshot for Bonaqua Still Water 500 ml.
  { names: ['Bonaqua Water Still 500ml', 'Bonaqua Still Water 500ml', 'Bonaqua Water Still 500 Ml'], image: '/images/brands/142291-Bonaqua-Water-Still-500Ml-565c94.png' },
];

export async function backfillUploadedProductImages() {
  let updated = 0;
  for (const entry of VERIFIED_IMAGE_MAPPINGS) {
    for (const name of entry.names) {
      const result = await prisma.sku.updateMany({
        where: { name, imageUrl: null },
        data: { imageUrl: entry.image },
      });
      updated += result.count;
    }
  }
  if (updated) console.log(`Uploaded product image backfill: filled ${updated} blank SKU image(s); existing images were preserved.`);
  return updated;
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  backfillUploadedProductImages()
    .then((count) => console.log(`Done. ${count} SKU row(s) updated.`))
    .catch((err) => {
      console.error('Uploaded product image backfill failed:', err?.message || err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
