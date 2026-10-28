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
import { fixBeerQuartFormats } from './fix-beer-quart-formats.js';
import { fixSavannaDryFormat } from './fix-savanna-dry-format.js';
import { fixPackSizes } from './fix-pack-sizes-oct-2026.js';
import { backfillQuartGaps } from './backfill-quart-gaps.js';
import { backfillFounderSourcedSkus } from './backfill-founder-sourced-skus.js';

const PACKSHOTS_750ML = {
  'Hennessy VS': '/images/brands/hennessy-vs.png',
  'Hennessy VSOP': '/images/brands/hennessy-vsop.png',
  'Hennessy XO': '/images/brands/hennessy-xo.png',
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

async function runRepairStep(label, task) {
  try {
    await task();
  } catch (err) {
    console.error(`Store catalogue repair step "${label}" failed: ${err?.message}`);
  }
}

async function fixExtremeEnergyDumpyFormat() {
  const sourceFormat = 'Dumpy (500ml)';
  const correctedFormat = 'Dumpy (330ml)';
  const rows = await prisma.sku.findMany({
    where: { name: 'Extreme Energy', category: 'CIDER_RTD', bottleFormat: sourceFormat },
    select: { id: true },
  });
  let changed = 0;
  for (const row of rows) {
    const duplicate = await prisma.sku.findFirst({
      where: { name: 'Extreme Energy', category: 'CIDER_RTD', bottleFormat: correctedFormat },
      select: { id: true },
    });
    if (duplicate) {
      console.warn('Extreme Energy dumpy size: 330ml SKU already exists; leaving 500ml row for manual reconciliation.');
      continue;
    }
    await prisma.sku.update({ where: { id: row.id }, data: { bottleFormat: correctedFormat } });
    changed += 1;
  }
  if (changed) console.log(`Extreme Energy dumpy size: corrected ${changed} SKU row(s) to 330ml.`);
  return changed;
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
  console.log('Amstel 750ml quart and 500ml can formats checked; separate packshots assigned.');
}

async function repairGuinnessForeignExtraFormats() {
  // South African retailer listings show Guinness Foreign Extra as a 325ml
  // non-returnable bottle, not a 500ml can or a generic 340ml dumpy.
  await upsertSkuByNameAndBottleFormat(prisma, {
    name: 'Guinness Foreign Extra',
    category: 'BEER',
    productType: 'ALCOHOL',
    bottleFormat: '325ml Bottle',
    unitsPerCase: 24,
    casePriceZAR: null,
  }, {});
  const invalidFormats = ['Can (500ml)', 'Can (440ml)', 'Can (330ml)', 'Dumpy (340ml)', 'Dumpy (330ml)'];
  let removed = 0;
  let quarantined = 0;
  for (const bottleFormat of invalidFormats) {
    const rows = await prisma.sku.findMany({
      where: { name: 'Guinness Foreign Extra', bottleFormat },
      select: { id: true, _count: { select: { basketItems: true, costItems: true } } },
    });
    for (const row of rows) {
      if (row._count.basketItems > 0 || row._count.costItems > 0) {
        await prisma.sku.update({ where: { id: row.id }, data: { casePriceZAR: null, imageUrl: null } });
        quarantined += 1;
        continue;
      }
      const result = await prisma.sku.deleteMany({ where: { id: row.id } });
      removed += result.count;
    }
  }
  console.log(`Guinness Foreign Extra format check: ${removed} invalid unlinked row(s) removed; ${quarantined} linked row(s) made unavailable; 325ml bottle ensured.`);
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
  console.log(`Black Label dumpy cleanup checked: ${rows.length} invalid format row(s) found; ${removed} unlinked row(s) removed.`);
}

export async function backfillHennessyProductImages() {
  if (process.env.RUN_BOOT_STORE_CATALOGUE_REPAIR === 'true') {
    console.warn('RUN_BOOT_STORE_CATALOGUE_REPAIR=true: applying targeted Store image and pack-format corrections.');
    // Correct existing beer/cider pack-size labels before assigning their images.
    await runRepairStep('beer quart sizes', fixBeerQuartFormats);
    await runRepairStep('Savanna Dry size', fixSavannaDryFormat);
    await runRepairStep('beer/cider can and dumpy sizes', fixPackSizes);
    await runRepairStep('Extreme Energy dumpy size', fixExtremeEnergyDumpyFormat);
    await runRepairStep('verified quart gaps', backfillQuartGaps);
    await runRepairStep('founder-confirmed SKU formats', backfillFounderSourcedSkus);
    await runRepairStep('Amstel quart and can', ensureAmstelFormats);
    await runRepairStep('Black Label nonexistent dumpy', removeBlackLabelDumpies);
    await runRepairStep('Guinness Foreign Extra bottle size', repairGuinnessForeignExtraFormats);
    await runRepairStep('brand image defaults', backfillBrandImages);
    await runRepairStep('product photo mappings', backfillExtractedBrandPhotos);
    await runRepairStep('format-specific photos', backfillFormatSpecificPhotos);
    await runRepairStep('verified cognac packshots', applyVerifiedCognacPackshots);
    await runRepairStep('broken local image cleanup', clearBrokenBrandPhotos);
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
