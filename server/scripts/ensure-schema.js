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
}
