// Idempotent product-image corrections for cognac SKUs with verified variant-specific packshots.
// Only imageUrl is changed. Prices, stock, case quantities and product names are untouched.
// Every mapping is scoped to a specific bottle size so a 750ml photo can never be
// silently assigned to a 375ml SKU. Where no verified matching image is available,
// keep the SKU on the UI placeholder rather than showing the wrong variant.
import prisma from '../config/db.js';

const PACKSHOTS_750ML = {
  'Hennessy VS': 'https://fr.hennessy.com/sites/hennessy_fr/files/2024-08/hny_vs_packshot_2000x2000.jpg',
  'Hennessy VSOP': 'https://www.hennessy.com/sites/hennessy/files/2023-04/HENNESSY-VSOP-BOTTLE.png',
  'Hennessy XO': 'https://www.hennessy.com/sites/hennessy/files/2025-10/2212_xo_bottle_front_2000x2000.jpg',
  'Remy Martin VSOP': 'https://cdn.shopify.com/s/files/1/0987/1588/products/remy-martin-vsop-cognac_1200x1200.jpg?v=1601327577',
  'Remy Martin 1738 Accord Royal': 'https://static-prod.remymartin.com/app/uploads/2026/05/collection-remy-martin-1738-accord-royal-lps-260527-01.jpg',
  'Martell VS': 'https://thedrinkshopsa.com/cdn/shop/files/martell1.webp?v=1735993297&width=1080',
  'Martell Blue Swift VSOP': 'https://cdn.shopify.com/s/files/1/2788/1238/files/Martell-Blue-Sw-ift-Cognac-750ml.jpg?v=1686640195',
};

export async function backfillHennessyProductImages() {
  let updated = 0;
  for (const [name, imageUrl] of Object.entries(PACKSHOTS_750ML)) {
    const result = await prisma.sku.updateMany({
      where: { name, bottleFormat: { contains: '750ml' }, NOT: { imageUrl } },
      data: { imageUrl },
    });
    updated += result.count;
  }

  // No verified 375ml packshot is in the approved mapping yet. Remove any
  // accidentally inherited 750ml image so the Store renders its safe placeholder.
  const smallBottle = await prisma.sku.updateMany({
    where: { name: 'Hennessy VS', bottleFormat: { contains: '375ml' }, imageUrl: { not: null } },
    data: { imageUrl: null },
  });
  updated += smallBottle.count;

  if (updated) console.log(`Variant-specific cognac product images: ${updated} SKU row(s) corrected.`);
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
