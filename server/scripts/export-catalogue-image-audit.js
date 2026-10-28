// Read-only production SKU export for image/variant review.
// Usage (from an authenticated server shell with DATABASE_URL configured):
//   node server/scripts/export-catalogue-image-audit.js > catalogue-image-audit.csv
// Contains SKU catalogue fields only; no customer, order, basket, supplier-cost,
// or account data. This script never updates the database.
import prisma from '../config/db.js';

function csv(value) {
  if (value == null) return '';
  const text = value instanceof Date ? value.toISOString() : String(value);
  return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}

function classifyImage(imageUrl) {
  if (!imageUrl || !String(imageUrl).trim()) return { kind: 'missing', host: '', review: 'MISSING_IMAGE' };
  const value = String(imageUrl).trim();
  if (value.startsWith('/')) return { kind: 'local', host: '', review: 'LOCAL_ASSET_NEEDS_VISUAL_REVIEW' };
  try {
    const url = new URL(value);
    return { kind: 'external', host: url.hostname, review: 'EXTERNAL_URL_NEEDS_VISUAL_REVIEW' };
  } catch {
    return { kind: 'invalid', host: '', review: 'INVALID_IMAGE_URL' };
  }
}

const columns = [
  'id', 'name', 'category', 'productType', 'bottleFormat',
  'unitsPerCase', 'bulkUnit', 'bulkUnitPlural', 'imageUrl',
  'imageKind', 'imageHost', 'reviewStatus',
];

try {
  const skus = await prisma.sku.findMany({
    select: {
      id: true, name: true, category: true, productType: true,
      bottleFormat: true, unitsPerCase: true, bulkUnit: true,
      bulkUnitPlural: true, imageUrl: true,
    },
    orderBy: [{ category: 'asc' }, { name: 'asc' }, { bottleFormat: 'asc' }],
  });

  process.stdout.write(columns.join(',') + '\n');
  for (const sku of skus) {
    const image = classifyImage(sku.imageUrl);
    const row = { ...sku, imageKind: image.kind, imageHost: image.host, reviewStatus: image.review };
    process.stdout.write(columns.map((column) => csv(row[column])).join(',') + '\n');
  }
  console.error('Read-only image audit export: ' + skus.length + ' SKU rows. No data changed.');
} catch (error) {
  console.error('Could not export catalogue image audit: ' + (error?.message || error));
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
