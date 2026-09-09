// One-off, idempotent column additions for features added after the last
// `prisma db push` against production (this project has no migrations
// history — schema changes are applied by hand). Safe to run on every
// boot: IF NOT EXISTS / OR REPLACE guards make repeats a no-op.
import prisma from '../config/db.js';

export async function ensureCeremonyBudgetColumns() {
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "Ceremony" ADD COLUMN IF NOT EXISTS "budgetZAR" DECIMAL(10,2);'
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "CeremonyCostItem" ADD COLUMN IF NOT EXISTS "isPurchased" BOOLEAN NOT NULL DEFAULT false;'
  );
  // Links a provisioning cost item to a real, purchasable Sku. No DB-level
  // FK constraint (this project has no migration history to add one
  // safely/idempotently) — Prisma's relation still works via app-level
  // joins, just without DB-enforced referential integrity.
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "CeremonyCostItem" ADD COLUMN IF NOT EXISTS "skuId" TEXT;'
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "Ceremony" ADD COLUMN IF NOT EXISTS "guestCount" INTEGER;'
  );
  // Real, researched supermarket-equivalent retail price for a Sku, used to
  // show a genuine "save vs retail" comparison. Left null for products with
  // no honest retail comparable (e.g. live animals) — never fabricated.
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "Sku" ADD COLUMN IF NOT EXISTS "retailPriceZAR" DECIMAL(10,2);'
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "BulkPool" ADD COLUMN IF NOT EXISTS "lastTierNotified" INTEGER NOT NULL DEFAULT 0;'
  );
  // Ubuhlanti bakwa Xhosa: ShrineTithe -> ShrineContribution (model renamed
  // via @@map, same physical table, no data migration needed). Contributions
  // are always voluntary now — payoutId becomes optional (public donations
  // aren't tied to any payout), plus source/donor/status for a general
  // contribution ledger instead of a forced per-payout tithe.
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "ShrineTithe" ALTER COLUMN "payoutId" DROP NOT NULL;'
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "ShrineTithe" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'PAYOUT_CONTRIBUTION';`
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "ShrineTithe" ADD COLUMN IF NOT EXISTS "donorName" TEXT;'
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "ShrineTithe" ADD COLUMN IF NOT EXISTS "donorEmail" TEXT;'
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "ShrineTithe" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'CONFIRMED';`
  );
  // A stokvel member opts in when requesting their payout — never a forced
  // deduction.
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "contributionOptIn" BOOLEAN NOT NULL DEFAULT false;'
  );
  // Ubuhlanti fund ledger: the same table now records money OUT (allocations
  // to real projects) as well as money in, so the fund keeps one source of
  // truth. Existing rows are all contributions, which the default covers.
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "ShrineTithe" ADD COLUMN IF NOT EXISTS "entryType" TEXT NOT NULL DEFAULT 'CONTRIBUTION';`
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "ShrineTithe" ADD COLUMN IF NOT EXISTS "sector" TEXT;'
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "ShrineTithe" ADD COLUMN IF NOT EXISTS "description" TEXT;'
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "ShrineTithe" ADD COLUMN IF NOT EXISTS "referenceUrl" TEXT;'
  );
  // What iCamagu pays a supplier per case — admin-only, never exposed on the
  // public catalogue. Nullable: unknown cost is honest, a guessed one is not.
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "Sku" ADD COLUMN IF NOT EXISTS "costPriceZAR" DECIMAL(10,2);'
  );
  // What one buying unit is actually called — only alcohol and tinned goods
  // come in "cases". See server/utils/bulkUnits.js.
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Sku" ADD COLUMN IF NOT EXISTS "bulkUnit" TEXT NOT NULL DEFAULT 'case';`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Sku" ADD COLUMN IF NOT EXISTS "bulkUnitPlural" TEXT NOT NULL DEFAULT 'cases';`
  );
  // Rolling-window pool cap (see server/utils/poolWindow.js): bounds how
  // large a single SmartMatch pool can grow before new baskets are routed
  // to a fresh pool instead.
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "BulkPool" ADD COLUMN IF NOT EXISTS "capCases" INTEGER;'
  );
  // Backfill only — never overwrites a value that's already set. Existing
  // OPEN pools predate the rolling window, so give them a real 72-hour
  // window and a real cap off their own moqTarget instead of leaving them
  // permanently uncapped.
  await prisma.$executeRawUnsafe(
    `UPDATE "BulkPool" SET "deadline" = NOW() + INTERVAL '72 hours' WHERE status = 'OPEN' AND "deadline" IS NULL;`
  );
  await prisma.$executeRawUnsafe(
    `UPDATE "BulkPool" SET "capCases" = "moqTarget" * 4 WHERE status = 'OPEN' AND "capCases" IS NULL;`
  );
}
