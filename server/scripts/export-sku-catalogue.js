// Read-only export of the live SKU catalogue for the UX/image audit.
// Run from the repository root with the production DATABASE_URL available:
//   node server/scripts/export-sku-catalogue.js
// Optional output path:
//   node server/scripts/export-sku-catalogue.js ./tmp/sku-catalogue.csv
// The export deliberately excludes internal supplier cost and private order data.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import prisma from '../config/db.js';

const columns = [
  'id', 'name', 'category', 'productType', 'bottleFormat', 'unitsPerCase',
  'bulkUnit', 'bulkUnitPlural', 'casePriceZAR', 'retailPriceZAR',
  'retailPriceSource', 'retailPriceCheckedAt', 'imageUrl', 'createdAt',
];

function csvCell(value) {
  if (value == null) return '';
  const text = value instanceof Date ? value.toISOString() : String(value);
  return /[",\r\n]/.test(text) ? '"' + text.replaceAll('"', '""') + '"' : text;
}

async function main() {
  const output = path.resolve(process.argv[2] || 'tmp/catalogue-audit/sku-catalogue-export.csv');
  const rows = await prisma.sku.findMany({
    select: Object.fromEntries(columns.map((column) => [column, true])),
    orderBy: [{ category: 'asc' }, { name: 'asc' }, { bottleFormat: 'asc' }],
  });
  const csv = [
    columns.join(','),
    ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(',')),
  ].join('\n') + '\n';
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, csv, 'utf8');
  const missingImages = rows.filter((row) => !row.imageUrl).length;
  console.log(JSON.stringify({
    output,
    rows: rows.length,
    missingImages,
    withImages: rows.length - missingImages,
    note: 'Read-only export; supplier cost and customer/order data are excluded.',
  }, null, 2));
}

main()
  .catch((error) => {
    console.error('SKU catalogue export failed:', error?.message || error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
