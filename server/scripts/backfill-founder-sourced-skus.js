// New Sku rows for products the founder sent a real photo of that weren't
// in the catalogue at all yet. Per standing instruction: when a genuine
// product photo arrives for something we don't carry, add it to the
// catalogue automatically rather than asking each time — as long as it's a
// real, identifiable product in line with the rest of the alcohol range.
// casePriceZAR stays null — no real iCamagu case cost exists yet, same
// discipline as every other catalogue addition; catalogued but not yet
// orderable until a real bulk price is set.
//
// Idempotent — upsertSkuByNameAndBottleFormat never touches a row that
// already exists.
import prisma from '../config/db.js';
import { upsertSkuByNameAndBottleFormat } from '../utils/upsertSku.js';

const NEW_SKUS = [
  { name: 'Southern Comfort', category: 'LIQUEUR', bottleFormat: '750ml Bottle', unitsPerCase: 12 },
  { name: 'Captain Morgan Spiced Gold', category: 'RUM', bottleFormat: '750ml Bottle', unitsPerCase: 12 },
  { name: 'Klipdrift Premium', category: 'BRANDY', bottleFormat: '750ml Bottle', unitsPerCase: 12 },
  // New pack format, not just a new brand — the founder sent a can photo for
  // each of these three Breezer flavours, but only a Dumpy (275ml) row
  // existed for any of them (see split-bundled-flavour-skus.js, which
  // created the Dumpy rows for these same three names). unitsPerCase: 24
  // matches every other CIDER_RTD Can (500ml) in the catalogue.
  { name: 'Breezer Blueberry', category: 'CIDER_RTD', bottleFormat: 'Can (500ml)', unitsPerCase: 24 },
  { name: 'Breezer Watermelon', category: 'CIDER_RTD', bottleFormat: 'Can (500ml)', unitsPerCase: 24 },
  { name: 'Breezer Blackberry', category: 'CIDER_RTD', bottleFormat: 'Can (500ml)', unitsPerCase: 24 },
  // Hunter's Iced — a genuinely new line (not a Dry/Gold reformulation),
  // confirmed by real bottle and can photos of both flavours.
  { name: "Hunter's Iced Apple", category: 'CIDER_RTD', bottleFormat: 'Dumpy (340ml)', unitsPerCase: 24 },
  { name: "Hunter's Iced Apple", category: 'CIDER_RTD', bottleFormat: 'Can (500ml)', unitsPerCase: 24 },
  { name: "Hunter's Iced Watermelon", category: 'CIDER_RTD', bottleFormat: 'Dumpy (340ml)', unitsPerCase: 24 },
  { name: "Hunter's Iced Watermelon", category: 'CIDER_RTD', bottleFormat: 'Can (500ml)', unitsPerCase: 24 },
  // Kopparberg's 7% "Vintage" range is a distinct, stronger product line
  // from the standard ~4% Kopparberg Pear already catalogued — not the same
  // item, so it gets its own row rather than replacing Pear's photo.
  { name: 'Kopparberg Sweet Vintage Pear', category: 'CIDER_RTD', bottleFormat: 'Can (500ml)', unitsPerCase: 24 },
  // Brutal Fruit "Spritzer" is a separate sub-line from the regular Brutal
  // Fruit RTD range already catalogued (Ruby Apple included) — same
  // flavour name, different product.
  { name: 'Brutal Fruit Spritzer Ruby Apple', category: 'CIDER_RTD', bottleFormat: 'Can (500ml)', unitsPerCase: 24 },
  // Spritzer's second flavour, found in a full re-check of every photo
  // sent this session.
  { name: 'Brutal Fruit Spritzer Strawberry Rouge', category: 'CIDER_RTD', bottleFormat: 'Can (500ml)', unitsPerCase: 24 },
  // A third, larger Corona bottle alongside the existing 355ml (Dumpy) and
  // 410ml (Can, see fix-beer-quart-formats.js) — confirmed by a real photo
  // showing a distinctly different bottle shape and label design from the
  // 355ml one already catalogued.
  { name: 'Corona', category: 'BEER', bottleFormat: 'Quart (600ml)', unitsPerCase: 12 },
  // Bisquit & Dubouche's third tier alongside the existing VS/VSOP.
  { name: 'Bisquit & Dubouche XO', category: 'COGNAC', bottleFormat: '750ml Bottle', unitsPerCase: 12 },
  // Flying Fish Dry Apple's Can (500ml) row was removed earlier as an
  // unconfirmed format (remove-nonexistent-formats.js) — a real can photo
  // has since confirmed it exists after all, so it's restored here.
  { name: 'Flying Fish Dry Apple', category: 'BEER', bottleFormat: 'Can (500ml)', unitsPerCase: 24 },
];

// Bernini Ruby Berry isn't a brand-new product — it was always the third
// flavour bundled into the original "Bernini Classic/Blush/Ruby" row, split
// out at the same time as Classic and Blush (split-bundled-flavour-skus.js)
// with the same pricing, then wrongly deleted as fictional before its real
// name was confirmed (remove-nonexistent-skus.js). Restoring it copies
// Classic/Blush's exact pricing per format, not null — this is completing
// that original split, not adding a new item with no known cost.
const RESTORED_SKUS = [
  { name: 'Bernini Ruby Berry', category: 'CIDER_RTD', bottleFormat: 'Can (500ml)', unitsPerCase: 24, casePriceZAR: 372.48, retailPriceZAR: 575.62, palletPackQty: 84, palletPriceZAR: 29998.08, supplierPortfolio: 'Heineken SA', bulkUnit: 'case', bulkUnitPlural: 'cases' },
  { name: 'Bernini Ruby Berry', category: 'CIDER_RTD', bottleFormat: 'Dumpy (275ml)', unitsPerCase: 24, casePriceZAR: 325.92, retailPriceZAR: 501.68, palletPackQty: 84, palletPriceZAR: 26248.32, supplierPortfolio: 'Heineken SA', bulkUnit: 'case', bulkUnitPlural: 'cases' },
];

export async function backfillFounderSourcedSkus() {
  let created = 0;
  for (const { name, category, bottleFormat, unitsPerCase } of NEW_SKUS) {
    const before = await prisma.sku.findFirst({ where: { name, bottleFormat } });
    await upsertSkuByNameAndBottleFormat(
      prisma,
      {
        name,
        category,
        productType: 'ALCOHOL',
        bottleFormat,
        unitsPerCase,
        casePriceZAR: null,
      },
      {}
    );
    if (!before) created++;
  }
  for (const item of RESTORED_SKUS) {
    const before = await prisma.sku.findFirst({ where: { name: item.name, bottleFormat: item.bottleFormat } });
    await upsertSkuByNameAndBottleFormat(prisma, { ...item, productType: 'ALCOHOL' }, {});
    if (!before) created++;
  }
  if (created > 0) console.log(`Founder-sourced SKU backfill: ${created} new row(s) created.`);
  return created;
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  backfillFounderSourcedSkus()
    .then((count) => console.log(`Done. ${count} row(s) created.`))
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
