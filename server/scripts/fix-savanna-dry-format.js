// Two corrections to Savanna, caught by the founder:
//
// 1. "Savanna Dry/Light" doesn't exist as a real product — like Windhoek's
//    fictional "Light" variant, Savanna only ships Dry (there's no Light).
//    Renamed to plain "Savanna Dry".
//
// 2. Its big returnable bottle was wrongly catalogued as a 750ml quart.
//    Savanna's big bottle is 500ml, not 750ml — corrected to Quart (500ml).
//
// Idempotent — both steps are no-ops once applied.
import prisma from '../config/db.js';

export async function fixSavannaDryFormat() {
  let changed = 0;

  const renamed = await prisma.sku.updateMany({
    where: { name: 'Savanna Dry/Light' },
    data: { name: 'Savanna Dry' },
  });
  changed += renamed.count;

  const resized = await prisma.sku.updateMany({
    where: { name: 'Savanna Dry', bottleFormat: 'Quart (750ml)' },
    data: { bottleFormat: 'Quart (500ml)' },
  });
  changed += resized.count;

  if (changed > 0) console.log(`Savanna Dry format fix: ${changed} row(s) corrected.`);
  return changed;
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  fixSavannaDryFormat()
    .then((count) => console.log(`Done. ${count} row(s) updated.`))
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
