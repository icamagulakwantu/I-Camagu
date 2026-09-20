// Sedgwick's Old Brown — South Africa's classic fortified sherry — was
// missing from the catalogue entirely. Real per-unit retail prices found
// published in September 2026: Shoprite listed the 750ml bottle at R64.99,
// Market Liquors listed the 2 Litre box at R121.99.
//
// No real iCamagu supplier quote exists for either format, so casePriceZAR
// here is derived from those retail prices (10% below the retail-comparable
// for the case, matching the discount every other verified single-unit item
// in the catalogue already carries) rather than a negotiated trade price.
// TREAT AS A PLACEHOLDER, same caveat as Commando Brandy in
// backfill-catalogue-expansion.js — replace with a real supplier quote once
// one exists.
//
// Upsert on [name, bottleFormat] — safe to re-run.
import prisma from '../config/db.js';
import { upsertSkuByNameAndBottleFormat } from '../utils/upsertSku.js';

const SEDGWICKS_SKUS = [
  {
    name: "Sedgwick's Old Brown",
    category: 'WINE',
    productType: 'ALCOHOL',
    bottleFormat: '750ml Bottle',
    unitsPerCase: 6,
    casePriceZAR: 330.00,
    palletPackQty: 100,
    palletPriceZAR: 31350.00,
    supplierPortfolio: 'Heineken SA',
    retailPriceZAR: 389.94,
    retailPriceNote: 'Shoprite R64.99/bottle, September 2026.',
  },
  {
    name: "Sedgwick's Old Brown",
    category: 'WINE_BOX',
    productType: 'ALCOHOL',
    bottleFormat: '2 Litre Box',
    unitsPerCase: 4,
    casePriceZAR: 415.00,
    palletPackQty: 75,
    palletPriceZAR: 29568.75,
    supplierPortfolio: 'Heineken SA',
    retailPriceZAR: 487.96,
    retailPriceNote: 'Market Liquors R121.99/box, September 2026.',
  },
];

export async function backfillSedgwicks() {
  let upserted = 0;
  for (const sku of SEDGWICKS_SKUS) {
    const create = { ...sku };
    if (create.retailPriceZAR != null) create.retailPriceSource = 'VERIFIED';
    await upsertSkuByNameAndBottleFormat(prisma, create, {});
    upserted += 1;
  }
  if (upserted > 0) console.log(`Sedgwick's backfill: ${upserted} row(s) upserted.`);
  return upserted;
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  backfillSedgwicks()
    .then((count) => console.log(`Done. ${count} row(s) upserted.`))
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
