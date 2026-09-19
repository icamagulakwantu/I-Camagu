// Adds the big-bottle ("quart") format for beers that are missing one, but
// only where that format genuinely exists in the SA market — checked via
// web search, not assumed from "most beers have a quart". Several brands
// the founder flagged as suspicious turned out to only be sold in cans/small
// NRBs in South Africa (Budweiser 330ml, Guinness Foreign Extra 325ml, Sol
// 330/500/660ml, Corona 355ml) — no quart exists for those, so nothing was
// added for them.
//
// Flying Fish and Stella Artois do have a real big-bottle format, just not
// at 750ml like Castle/Amstel/Black Label — Shoprite itself calls Flying
// Fish's 660ml bottle a "quart" (its own product listing: "Flying Fish
// Premium Flavoured Beer Quarts 3x660ml"), and Stella Artois's big bottle is
// 620ml (Pick n Pay/Takealot NRB listing). casePriceZAR is left null — no
// real iCamagu-negotiated case cost exists yet, same rule as every other new
// catalogue addition; the verified per-bottle retail price is set via
// backfillVerifiedRetailPrices in backfill-bulk-units.js instead.
//
// Idempotent — upsertSkuByNameAndBottleFormat never touches a row that
// already exists.
import prisma from '../config/db.js';
import { upsertSkuByNameAndBottleFormat } from '../utils/upsertSku.js';

const QUART_GAPS = [
  { name: 'Flying Fish Lemon', bottleFormat: 'Quart (660ml)' },
  { name: 'Stella Artois', bottleFormat: 'Quart (620ml)' },
];

export async function backfillQuartGaps() {
  let created = 0;
  for (const { name, bottleFormat } of QUART_GAPS) {
    const before = await prisma.sku.findFirst({ where: { name, bottleFormat } });
    await upsertSkuByNameAndBottleFormat(
      prisma,
      {
        name,
        category: 'BEER',
        productType: 'ALCOHOL',
        bottleFormat,
        unitsPerCase: 12,
        casePriceZAR: null,
        palletPackQty: 60,
        supplierPortfolio: 'SAB',
      },
      {}
    );
    if (!before) created++;
  }
  if (created > 0) console.log(`Quart gap backfill: ${created} new row(s) created.`);
  return created;
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  backfillQuartGaps()
    .then((count) => console.log(`Done. ${count} row(s) created.`))
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
