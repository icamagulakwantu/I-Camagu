// Idempotent product-image corrections for cognac SKUs with verified variant-specific packshots.
// Only imageUrl is changed. Prices, stock, case quantities and product names are untouched.
// Every mapping is scoped to a specific bottle size so a 750ml photo can never be
// silently assigned to a 375ml SKU. Where no verified matching image is available,
// keep the SKU on the UI placeholder rather than showing the wrong variant.
import prisma from '../config/db.js';
import { upsertSkuByNameAndBottleFormat } from '../utils/upsertSku.js';
import { backfillBrandImages } from './backfill-brand-images.js';
import { backfillExtractedBrandPhotos } from './backfill-extracted-brand-photos.js';
import { backfillFormatSpecificPhotos } from './backfill-format-specific-photos.js';
import { clearBrokenBrandPhotos } from './clear-broken-brand-photos.js';

const PACKSHOTS_750ML = {
  'Hennessy VS': 'https://fr.hennessy.com/sites/hennessy_fr/files/2024-08/hny_vs_packshot_2000x2000.jpg',
  'Hennessy VSOP': 'https://www.hennessy.com/sites/hennessy/files/2023-04/HENNESSY-VSOP-BOTTLE.png',
  'Hennessy XO': 'https://www.hennessy.com/sites/hennessy/files/2025-10/2212_xo_bottle_front_2000x2000.jpg',
  'Remy Martin VSOP': 'https://cdn.shopify.com/s/files/1/0987/1588/products/remy-martin-vsop-cognac_1200x1200.jpg?v=1601327577',
  'Remy Martin 1738 Accord Royal': 'https://static-prod.remymartin.com/app/uploads/2026/05/collection-remy-martin-1738-accord-royal-lps-260527-01.jpg',
  'Martell VS': 'https://thedrinkshopsa.com/cdn/shop/files/martell1.webp?v=1735993297&width=1080',
  'Martell Blue Swift VSOP': 'https://cdn.shopify.com/s/files/1/2788/1238/files/Martell-Blue-Sw-ift-Cognac-750ml.jpg?v=1686640195',
};

async function applyVerifiedCognacPackshots() {
  let updated = 0;
  for (const [name, imageUrl] of Object.entries(PACKSHOTS_750ML)) {
    const result = await prisma.sku.updateMany({
      where: { name, bottleFormat: { contains: '750ml' } },
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

async function ensureAmstelFormats() {
  const formats = [
    { name: 'Amstel Lager', category: 'BEER', productType: 'ALCOHOL', bottleFormat: 'Quart (750ml)', unitsPerCase: 12, casePriceZAR: null, supplierPortfolio: 'SAB' },
    { name: 'Amstel Lager', category: 'BEER', productType: 'ALCOHOL', bottleFormat: 'Can (500ml)', unitsPerCase: 24, casePriceZAR: null, supplierPortfolio: 'SAB' },
  ];
  for (const item of formats) await upsertSkuByNameAndBottleFormat(prisma, item, {});
  await prisma.sku.updateMany({
    where: { name: 'Amstel Lager', bottleFormat: 'Quart (750ml)' },
    data: { imageUrl: '/images/brands/amstel-lager.png' },
  });
  await prisma.sku.updateMany({
    where: { name: 'Amstel Lager', bottleFormat: 'Can (500ml)' },
    data: { imageUrl: '/images/brands/amstel-lager-can.png' },
  });
}

async function removeBlackLabelDumpies() {
  const rows = await prisma.sku.findMany({
    where: { name: 'Black Label', bottleFormat: { startsWith: 'Dumpy (' } },
    select: { id: true, _count: { select: { basketItems: true, costItems: true } } },
  });
  let removed = 0;
  for (const row of rows) {
    if (row._count.basketItems > 0 || row._count.costItems > 0) {
      await prisma.sku.update({ where: { id: row.id }, data: { casePriceZAR: null, imageUrl: null } });
      console.warn('Black Label dumpy kept only to preserve linked history; made unavailable.');
      continue;
    }
    const result = await prisma.sku.deleteMany({ where: { id: row.id } });
    removed += result.count;
  }
  if (removed) console.log(`Removed ${removed} nonexistent Black Label dumpy SKU(s).`);
}

export async function backfillHennessyProductImages() {
  if (process.env.RUN_BOOT_STORE_CATALOGUE_REPAIR === 'true') {
    console.warn('RUN_BOOT_STORE_CATALOGUE_REPAIR=true: applying targeted Store image and pack-format corrections.');
    await ensureAmstelFormats();
    await removeBlackLabelDumpies();
    await backfillBrandImages();
    await backfillExtractedBrandPhotos();
    await backfillFormatSpecificPhotos();
    await applyVerifiedCognacPackshots();
    await clearBrokenBrandPhotos();
    console.log('Targeted Store catalogue repair completed. Unset RUN_BOOT_STORE_CATALOGUE_REPAIR now.');
    return;
  }
  return applyVerifiedCognacPackshots();
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
