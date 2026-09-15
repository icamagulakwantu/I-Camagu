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
  // Provenance for retailPriceZAR. Without this the catalogue cannot tell a
  // price somebody checked from a price something guessed, and a "you save
  // R80" claim could be built on the guess. The public endpoint withholds
  // the price unless the source is VERIFIED.
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "Sku" ADD COLUMN IF NOT EXISTS "retailPriceSource" TEXT;'
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "Sku" ADD COLUMN IF NOT EXISTS "retailPriceCheckedAt" TIMESTAMP(3);'
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "Sku" ADD COLUMN IF NOT EXISTS "retailPriceNote" TEXT;'
  );
  // The retail prices that predate this column were each checked by hand
  // against a named shop before being entered, so they start VERIFIED. Rows
  // without a price stay null on all three.
  await prisma.$executeRawUnsafe(
    `UPDATE "Sku" SET "retailPriceSource" = 'VERIFIED'
      WHERE "retailPriceZAR" IS NOT NULL AND "retailPriceSource" IS NULL;`
  );
  // Rolling-window pool cap (see server/utils/poolWindow.js): bounds how
  // large a single SmartMatch pool can grow before new baskets are routed
  // to a fresh pool instead.
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "BulkPool" ADD COLUMN IF NOT EXISTS "capCases" INTEGER;'
  );
  // Backfill only — never overwrites a value that's already set. Existing
  // OPEN pools predate the rolling window, so give them a real cap off
  // their own moqTarget instead of leaving them permanently uncapped.
  //
  // Deliberately does NOT backfill a deadline anymore: a pool's expiry is
  // now solely the target date whoever started it chose (see
  // poolWindow.js) — null means "no target date set", not "forgot to set
  // one". This ran once already for pools that predated the deadline
  // column entirely; re-adding a 72-hour default here would silently
  // overwrite every intentionally-open-ended pool on the next deploy.
  await prisma.$executeRawUnsafe(
    `UPDATE "BulkPool" SET "capCases" = "moqTarget" * 4 WHERE status = 'OPEN' AND "capCases" IS NULL;`
  );
  // Replaced by tierBasis + tierLadder below, in the same deploy this
  // column shipped in — never held real data (every pool was still null),
  // so dropped rather than carried forward with the wrong shape.
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "BulkPool" DROP COLUMN IF EXISTS "tierCasePricing";'
  );
  // How this pool's SmartMatch tiers are measured (pallets for alcohol,
  // Rand amount for groceries/livestock — see smartMatchTiers.js) and its
  // real negotiated ladder, set by hand once a wholesaler quote exists.
  // Null until then; never a placeholder.
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "BulkPool" ADD COLUMN IF NOT EXISTS "tierBasis" TEXT NOT NULL DEFAULT 'PALLETS';`
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "BulkPool" ADD COLUMN IF NOT EXISTS "tierLadder" JSONB;'
  );
  // Real, per-item cost on a ceremony checklist item — for anything that
  // isn't a priced catalogue item (a lift in a friend's bakkie for exactly
  // R200 of petrol has no SKU). Nullable both ways: an estimate is
  // optional, and nothing is guessed until a member enters a real number.
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "CeremonyChecklistItem" ADD COLUMN IF NOT EXISTS "targetCostZAR" DECIMAL(10,2);'
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "CeremonyChecklistItem" ADD COLUMN IF NOT EXISTS "actualCostZAR" DECIMAL(10,2);'
  );
  // A grocery/produce SKU can now exist before it has a real member price —
  // catalogued from the founder's own list, priced only once someone has
  // actually been to Makro/Food Lover's. Downstream code treats a null
  // casePriceZAR as "not yet orderable" (skuVisibility.js, Store, basket add).
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "Sku" ALTER COLUMN "casePriceZAR" DROP NOT NULL;'
  );
  // Settlement destination for a PSP-routed pool payout (Stitch/Ozow-style
  // same-day pass-through). Null until a real banking relationship exists
  // for this partner.
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "Partner" ADD COLUMN IF NOT EXISTS "bankName" TEXT;'
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "Partner" ADD COLUMN IF NOT EXISTS "bankAccountHolder" TEXT;'
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "Partner" ADD COLUMN IF NOT EXISTS "bankAccountNumber" TEXT;'
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "Partner" ADD COLUMN IF NOT EXISTS "bankBranchCode" TEXT;'
  );
  // A PSP's raw webhook payload for a pool payment, kept verbatim for
  // reconciliation/debugging (same pattern as RawBankLog.rawPayload), plus
  // when the PSP itself confirmed settlement. Both null for manual-EFT
  // payments, which have no webhook and are settled by an official marking
  // them CLEARED instead.
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "PoolPayment" ADD COLUMN IF NOT EXISTS "rawPayload" JSONB;'
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "PoolPayment" ADD COLUMN IF NOT EXISTS "settledAt" TIMESTAMP(3);'
  );
  // Tracks the manual bank transfer that moves a PSP-collected payment
  // (provider e.g. 'PAYFAST') on from iCamagu's own merchant account to the
  // supplier — a real gap the PayFast integration opened up (PayFast pays
  // iCamagu, not the supplier directly), to be closed later by a real
  // payout API once a PSP relationship exists for it. Manual-EFT payments
  // never touch these; the member already paid the supplier directly.
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "PoolPayment" ADD COLUMN IF NOT EXISTS "payoutForwardedAt" TIMESTAMP(3);'
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "PoolPayment" ADD COLUMN IF NOT EXISTS "payoutReference" TEXT;'
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "PoolPayment" ADD COLUMN IF NOT EXISTS "payoutNote" TEXT;'
  );
}
