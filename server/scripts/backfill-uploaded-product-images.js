// Idempotent image repair for founder photos committed under public/images/brands.
//
// Why the first version never worked: a Store product is stored as a NAME
// plus a separate pack/type column (bottleFormat), e.g. name "Goat" with
// bottleFormat "Inkabi (male)". The old mapping looked for a single name like
// "Goat — Inkabi (male)", which is only how the audit report *prints* a row,
// so no SKU ever matched and every livestock photo stayed missing.
//
// This version matches on (name, bottleFormat) and only writes when the image
// differs, so it is safe on every boot. It changes imageUrl only, never prices,
// stock, pack sizes or anything else.
import prisma from '../config/db.js';

const brandImage = (file) => `/images/brands/${encodeURIComponent(file)}`;

// Each photo was checked by eye against the animal and male/female type.
const FORMAT_IMAGES = [
  { name: 'Goat', formatContains: 'Inkabi', file: 'images (13).jpeg' },
  { name: 'Goat', formatContains: 'Imazi', file: 'images (14).jpeg' },
  { name: 'Sheep', formatContains: 'Inkabi', file: 'images (11).jpeg' },
  { name: 'Sheep', formatContains: 'Imazi', file: 'images (12).jpeg' },
  // Sybok = Angora goat.
  { name: 'Sybok', formatContains: 'Inkabi', file: 'images (16).jpeg' },
  { name: 'Sybok', formatContains: 'Imazi', file: 'images (15).jpeg' },
  { name: 'Inkomo / Cow', formatContains: 'Inkabi', file: 'images (18).jpeg' },
  { name: 'Inkomo / Cow', formatContains: 'Imazi', file: 'iStock-1292580655.jpg' },
  // KOO 3kg catering tin.
  { name: 'Baked Beans', formatContains: '3kg', file: 'baked-beans.jpg' },
  // Coca-Cola can photo for the can rows that had their image cleared while
  // the 250ml vs 300ml pack size was being checked.
  { name: 'Coca-Cola', formatContains: '250ml', file: 'images (8).jpeg' },
];

// Products where every pack size looks the same, matched by name only.
const NAME_IMAGES = [
  { name: 'Boerewors', file: 'boerewors.png' },
  { name: 'Chutney', file: 'chutney.png' },
  { name: 'Salt', file: 'salt.jpg' },
  { name: 'Strawberry Lips', file: 'strawberry-lips.jpg' },
];

const differentImage = (imageUrl) => [{ imageUrl: null }, { imageUrl: { not: imageUrl } }];

export async function backfillUploadedProductImages() {
  let updated = 0;
  for (const { name, formatContains, file } of FORMAT_IMAGES) {
    const imageUrl = brandImage(file);
    const result = await prisma.sku.updateMany({
      where: { name, bottleFormat: { contains: formatContains }, OR: differentImage(imageUrl) },
      data: { imageUrl },
    });
    updated += result.count;
  }
  for (const { name, file } of NAME_IMAGES) {
    const imageUrl = brandImage(file);
    const result = await prisma.sku.updateMany({
      where: { name, OR: differentImage(imageUrl) },
      data: { imageUrl },
    });
    updated += result.count;
  }
  if (updated) console.log(`Uploaded product image backfill: set ${updated} SKU image(s) from founder photos.`);
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
