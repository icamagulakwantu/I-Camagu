import prisma from '../config/db.js';
import { resolveBulkUnit, labelsFor } from '../utils/bulkUnits.js';

// Classifies every Sku with the unit it is actually bought in. Idempotent:
// re-running only writes rows whose unit has changed, so a normal boot is a
// no-op once the catalogue is classified.
// Deliberately raw SQL rather than the Prisma client. This runs immediately
// after ensure-schema adds the columns, and a generated client that predates
// them makes `select: { bulkUnit: true }` throw PrismaClientValidationError
// — which is exactly how this silently failed the first time. Raw SQL talks
// to the columns that actually exist right now.
export async function backfillBulkUnits() {
  const skus = await prisma.$queryRawUnsafe(
    'SELECT id, name, category, "bulkUnit" FROM "Sku"'
  );

  let updated = 0;
  for (const sku of skus) {
    const labels = labelsFor(resolveBulkUnit(sku));
    if (sku.bulkUnit === labels.bulkUnit) continue;
    await prisma.$executeRawUnsafe(
      'UPDATE "Sku" SET "bulkUnit" = $1, "bulkUnitPlural" = $2 WHERE id = $3',
      labels.bulkUnit,
      labels.bulkUnitPlural,
      sku.id
    );
    updated++;
  }

  if (updated > 0) console.log(`Bulk unit backfill: ${updated} SKU(s) reclassified.`);
  return updated;
}

// Real, checked retail prices for a like-for-like single unit, used only to
// show an honest "you save X" against what a person would actually pay in a
// shop. Every figure here was looked up against a named South African
// retailer — nothing estimated, nothing rounded up to flatter the saving.
// Left absent for anything not yet verified: no retail price shown is far
// better than an invented one.
const VERIFIED_RETAIL = [
  // Cognac — Makro Liquor shelf price (VS was also seen on promotion at
  // R519.03, which is BELOW our bulk price; see the pricing review).
  { name: 'Hennessy VS', bottleFormat: '750ml Bottle', retail: 589.00, source: 'Makro Liquor' },
  { name: 'Hennessy VSOP', bottleFormat: '750ml Bottle', retail: 989.00, source: 'Takealot' },
  // SA brandy — Checkers / Makro shelf price.
  { name: 'Klipdrift Export', bottleFormat: '750ml Bottle', retail: 189.99, source: 'Checkers' },
  // Beer quart-format gaps (backfill-quart-gaps.js) — shelf price per bottle.
  { name: 'Flying Fish Lemon', bottleFormat: 'Quart (660ml)', retail: 24.99, source: 'Shoprite' },
  { name: 'Stella Artois', bottleFormat: 'Quart (620ml)', retail: 28.00, source: 'Pick n Pay' },
];

export async function backfillVerifiedRetailPrices() {
  let updated = 0;
  for (const item of VERIFIED_RETAIL) {
    // Retail is quoted per bottle; the catalogue stores a case price, so the
    // comparable retail figure for a case is retail x units in that case.
    const sku = await prisma.sku.findFirst({
      where: { name: item.name, bottleFormat: item.bottleFormat },
      select: { id: true, unitsPerCase: true, retailPriceZAR: true },
    });
    if (!sku) continue;

    const caseRetail = item.retail * (sku.unitsPerCase || 1);
    if (sku.retailPriceZAR && parseFloat(sku.retailPriceZAR) === caseRetail) continue;

    await prisma.sku.update({
      where: { id: sku.id },
      data: { retailPriceZAR: caseRetail },
    });
    updated++;
  }

  if (updated > 0) console.log(`Verified retail price backfill: ${updated} SKU(s) updated.`);
  return updated;
}
