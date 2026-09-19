// Corrects two mistakes the founder caught in the beer catalogue:
//
// 1. "Windhoek Lager/Light" doesn't exist as a real product — Windhoek only
//    sells Lager and Draught in South Africa/Namibia, never a "Light"
//    variant. Renamed to plain "Windhoek Lager".
//
// 2. Several quart-format rows had the wrong bottle size. The rule: an
//    international brand's big bottle is 620ml (matches Stella Artois,
//    already correct), a South African or Namibian brand's is 750ml.
//    Heineken (international) was wrongly at 500ml; Windhoek Lager and
//    Windhoek Draught (both Namibian) were wrongly at 500ml/440ml. 500ml on
//    its own is a can size, not a quart, in every one of these cases.
//
// Flying Fish's 660ml quart is deliberately NOT "corrected" to 750ml here —
// that size is verified against Shoprite's own listing (which itself calls
// it a "Quart"), so it's a real exception, not a data error.
//
// Idempotent — every step is a no-op once applied.
import prisma from '../config/db.js';

export async function fixBeerQuartFormats() {
  let changed = 0;

  const renamed = await prisma.sku.updateMany({
    where: { name: 'Windhoek Lager/Light' },
    data: { name: 'Windhoek Lager' },
  });
  changed += renamed.count;

  const fixes = [
    { name: 'Heineken', from: 'Quart (500ml)', to: 'Quart (620ml)' },
    { name: 'Windhoek Lager', from: 'Quart (500ml)', to: 'Quart (750ml)' },
    { name: 'Windhoek Draught', from: 'Quart (440ml)', to: 'Quart (750ml)' },
  ];
  for (const { name, from, to } of fixes) {
    const { count } = await prisma.sku.updateMany({
      where: { name, bottleFormat: from },
      data: { bottleFormat: to },
    });
    changed += count;
  }

  if (changed > 0) console.log(`Beer quart format fix: ${changed} row(s) corrected.`);
  return changed;
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  fixBeerQuartFormats()
    .then((count) => console.log(`Done. ${count} row(s) updated.`))
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
