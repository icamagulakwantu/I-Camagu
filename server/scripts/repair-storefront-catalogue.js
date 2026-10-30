// One-time, narrowly scoped repair for the live Store catalogue.
// This deliberately excludes price changes, broad SKU deletion, and unrelated
// maintenance. Run only with RUN_BOOT_STORE_CATALOGUE_REPAIR=true, then unset it.
// Images are assigned in precedence order: brand defaults -> real product photos
// -> exact pack-format photos -> official cognac packshots -> broken-path cleanup.
//
// The Black Label dumpy is no longer removed here: the founder confirmed it
// is a real product (30 Oct 2026, see backfill-founder-photos-oct-30.js).
import prisma from '../config/db.js';
import { upsertSkuByNameAndBottleFormat } from '../utils/upsertSku.js';
import { backfillBrandImages } from './backfill-brand-images.js';
import { backfillExtractedBrandPhotos } from './backfill-extracted-brand-photos.js';
import { backfillFormatSpecificPhotos } from './backfill-format-specific-photos.js';
import { backfillHennessyProductImages } from './backfill-hennessy-product-images.js';
import { clearBrokenBrandPhotos } from './clear-broken-brand-photos.js';

async function ensureAmstelFormats() {
  const formats = [
    { name: 'Amstel Lager', category: 'BEER', productType: 'ALCOHOL', bottleFormat: 'Quart (750ml)', unitsPerCase: 12, casePriceZAR: null, supplierPortfolio: 'SAB' },
    { name: 'Amstel Lager', category: 'BEER', productType: 'ALCOHOL', bottleFormat: 'Can (500ml)', unitsPerCase: 24, casePriceZAR: null, supplierPortfolio: 'SAB' },
  ];
  for (const item of formats) {
    await upsertSkuByNameAndBottleFormat(prisma, item, {});
  }
  // The quart uses the full-size bottle photo; the can has its own can packshot.
  await prisma.sku.updateMany({
    where: { name: 'Amstel Lager', bottleFormat: 'Quart (750ml)' },
    data: { imageUrl: '/images/brands/amstel-lager.png' },
  });
  await prisma.sku.updateMany({
    where: { name: 'Amstel Lager', bottleFormat: 'Can (500ml)' },
    data: { imageUrl: '/images/brands/amstel-lager-can.png' },
  });
}

export async function repairStorefrontCatalogue() {
  await ensureAmstelFormats();
  await backfillBrandImages();
  await backfillExtractedBrandPhotos();
  await backfillFormatSpecificPhotos();
  await backfillHennessyProductImages();
  await clearBrokenBrandPhotos();
  console.log('Targeted Store image and pack-format repair completed.');
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  repairStorefrontCatalogue()
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
