// One-off backfill: corrects casePriceZAR/palletPriceZAR on Sku rows that
// were seeded with premium-spirit prices above real SA retail — the
// opposite of the intended bulk-direct-no-warehousing positioning (see
// commit "Reprice overpriced premium spirits to beat retail, not lose to
// it" for sourcing). Safe to re-run — only ever sets these specific rows
// to these specific values.
//
// Exported as backfillSpiritPricing() so it can run on server boot
// (server/index.js) in addition to standalone via:
//   node server/scripts/backfill-spirit-pricing.js
import prisma from '../config/db.js';

const PRICE_FIXES = [
  { name: 'Glenfiddich 12 Year', bottleFormat: '750ml Bottle', casePriceZAR: 7550.40, palletPriceZAR: 434148.00 },
  { name: 'Hennessy VS', bottleFormat: '750ml Bottle', casePriceZAR: 6336.00, palletPriceZAR: 364320.00 },
  { name: 'Hennessy VSOP', bottleFormat: '750ml Bottle', casePriceZAR: 10260.00, palletPriceZAR: 589950.00 },
  { name: 'Hennessy XO', bottleFormat: '750ml Bottle', casePriceZAR: 33480.00, palletPriceZAR: 1925100.00 },
  { name: 'Martell VS', bottleFormat: '750ml Bottle', casePriceZAR: 6102.00, palletPriceZAR: 350865.00 },
  { name: 'Martell Blue Swift VSOP', bottleFormat: '750ml Bottle', casePriceZAR: 10800.00, palletPriceZAR: 621000.00 },
  { name: "D'USSE VSOP", bottleFormat: '750ml Bottle', casePriceZAR: 9504.00, palletPriceZAR: 546480.00 },
  { name: 'Tanqueray No. TEN', bottleFormat: '750ml Bottle', casePriceZAR: 5551.20, palletPriceZAR: 319194.00 },
  { name: 'Clase Azul Plata', bottleFormat: '750ml Bottle', casePriceZAR: 32292.00, palletPriceZAR: 1846698.75 },
  { name: 'Clase Azul Reposado', bottleFormat: '750ml Bottle', casePriceZAR: 48600.00, palletPriceZAR: 2779312.50 },
  { name: 'Moet & Chandon Imperial Brut', bottleFormat: '750ml Bottle', casePriceZAR: 3942.00, palletPriceZAR: 373452.63 },
  { name: 'Veuve Clicquot Yellow Label', bottleFormat: '750ml Bottle', casePriceZAR: 4590.00, palletPriceZAR: 434842.11 },
];

export async function backfillSpiritPricing() {
  let totalUpdated = 0;
  for (const { name, bottleFormat, casePriceZAR, palletPriceZAR } of PRICE_FIXES) {
    const { count } = await prisma.sku.updateMany({
      where: { name, bottleFormat },
      data: { casePriceZAR, palletPriceZAR },
    });
    totalUpdated += count;
  }
  if (totalUpdated > 0) {
    console.log(`Spirit pricing backfill: ${totalUpdated} row(s) updated.`);
  }
  return totalUpdated;
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  backfillSpiritPricing()
    .then((count) => console.log(`Done. ${count} row(s) updated.`))
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
