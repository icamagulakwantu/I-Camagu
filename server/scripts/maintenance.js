// One-off catalogue data repairs (formats, prices, photos).
//
// DB-02: these used to run on EVERY server start, about 25 of them in a row,
// and one of them overwrote another's prices each boot. They now run only
// when an operator asks for it, either:
//   - once, by hand:            node server/scripts/run-maintenance.js
//   - on boot, deliberately:    set RUN_BOOT_MAINTENANCE=true for ONE deploy,
//                               then remove it again.
// Order matters and is kept exactly as it was in server/index.js.
import { runTasks } from './maintenanceRunner.js';
import { backfillBrandImages } from './backfill-brand-images.js';
import { backfillHennessyProductImages } from './backfill-hennessy-product-images.js';
import { backfillSpiritPricing } from './backfill-spirit-pricing.js';
import { backfillCeremonySkus } from './backfill-ceremony-skus.js';
import { backfillCatalogueExpansion } from './backfill-catalogue-expansion.js';
import { backfillGroceryBulkCatalog } from './backfill-grocery-bulk-catalog.js';
import { backfillClothingSkus } from './backfill-clothing-skus.js';
import { backfillMoninSyrups } from './backfill-monin-syrups.js';
import { backfillBulkUnits, backfillVerifiedRetailPrices } from './backfill-bulk-units.js';
import { backfillQuartGaps } from './backfill-quart-gaps.js';
import { backfillExtractedBrandPhotos } from './backfill-extracted-brand-photos.js';
import { clearBrokenBrandPhotos } from './clear-broken-brand-photos.js';
import { backfillFormatSpecificPhotos } from './backfill-format-specific-photos.js';
import { fixBeerQuartFormats } from './fix-beer-quart-formats.js';
import { fixSavannaDryFormat } from './fix-savanna-dry-format.js';
import { backfillFounderSourcedSkus } from './backfill-founder-sourced-skus.js';
import { splitBundledFlavourSkus } from './split-bundled-flavour-skus.js';
import { removeNonexistentSkus } from './remove-nonexistent-skus.js';
import { removeNonexistentFormats } from './remove-nonexistent-formats.js';
import { remove375mlFormats } from './remove-375ml-formats.js';
import { renameMislabeledSkus } from './rename-mislabeled-skus.js';
import { fixAboveRetailPricing } from './fix-above-retail-pricing.js';
import { backfillSedgwicks } from './backfill-sedgwicks.js';
import { backfillLaunchPricing } from './backfill-launch-pricing.js';
import { fixPackSizes, applyOctober2026Prices } from './fix-pack-sizes-oct-2026.js';

export const MAINTENANCE_TASKS = [
  ['Beer quart format fix', fixBeerQuartFormats],
  ['Savanna Dry format fix', fixSavannaDryFormat],
  ['Bundled flavour split', splitBundledFlavourSkus],
  ['Nonexistent SKU removal', removeNonexistentSkus],
  ['Nonexistent format removal', removeNonexistentFormats],
  ['375ml format removal', remove375mlFormats],
  ['Mislabeled SKU rename', renameMislabeledSkus],
  // After splits and renames (so it sees final names), before any backfill
  // that matches rows by their corrected pack size.
  ['Pack size fix', fixPackSizes],
  ['Brand image backfill', backfillBrandImages],
  ['Spirit pricing backfill', backfillSpiritPricing],
  ['Ceremony SKU backfill', backfillCeremonySkus],
  ['Catalogue expansion SKU backfill', backfillCatalogueExpansion],
  ['Grocery bulk catalogue backfill', backfillGroceryBulkCatalog],
  ['Clothing SKU backfill', backfillClothingSkus],
  ['Monin syrup backfill', backfillMoninSyrups],
  ['Quart gap backfill', backfillQuartGaps],
  ['Bulk unit backfill', backfillBulkUnits],
  ['Verified retail price backfill', backfillVerifiedRetailPrices],
  ['Above-retail pricing fix', fixAboveRetailPricing],
  ['Founder-sourced SKU backfill', backfillFounderSourcedSkus],
  ["Sedgwick's backfill", backfillSedgwicks],
  ['Extracted brand photo backfill', backfillExtractedBrandPhotos],
  ['Format-specific photo backfill', backfillFormatSpecificPhotos],
  ['Official Hennessy product images', backfillHennessyProductImages],
  ['Broken brand photo clear', clearBrokenBrandPhotos],
  ['Launch pricing backfill', backfillLaunchPricing],
  // Last, deliberately: the verified retail price backfill above rewrites
  // Hennessy VS to an older Makro shelf price, so the newer dated October
  // prices must be applied after it.
  ['October 2026 prices', applyOctober2026Prices],
];

// Returns the labels of the tasks that failed.
export function runMaintenance() {
  return runTasks(MAINTENANCE_TASKS);
}
