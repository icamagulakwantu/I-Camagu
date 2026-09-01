// One-off backfill: sets imageUrl on existing Sku rows for the real SAB
// brand logos, so products already in the production DB (seeded before
// these were added) pick them up without a full re-seed.
// Safe to re-run — it only ever sets these specific known names.
//
// Usage: node server/scripts/backfill-brand-images.js
import prisma from '../config/db.js';

const BRAND_IMAGES = {
  'Black Label': 'carling-black-label',
  'Castle Lager': 'castle-lager',
  'Castle Milk Stout': 'castle-milk-stout',
  'Castle Lite': 'castle-lite',
  'Corona': 'corona',
  'Flying Fish Lemon/Apple': 'flying-fish',
  'Flying Fish Chill': 'flying-fish',
  'Stella Artois': 'stella-artois',
  'Hansa Pilsener': 'hansa-pilsener',
  'Lion Lager': 'lion-lager',
  'Brutal Fruit Ruby/Litchi': 'brutal-fruit',
  "Redd's Berry/Orig/Green": 'redds',
  "Redd's MXD Pine/Guarana": 'mxd',
};

async function main() {
  let totalUpdated = 0;
  for (const [name, slug] of Object.entries(BRAND_IMAGES)) {
    const { count } = await prisma.sku.updateMany({
      where: { name },
      data: { imageUrl: `/images/brands/${slug}.png` },
    });
    console.log(`${name}: updated ${count} row(s)`);
    totalUpdated += count;
  }
  console.log(`Done. ${totalUpdated} row(s) updated.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
