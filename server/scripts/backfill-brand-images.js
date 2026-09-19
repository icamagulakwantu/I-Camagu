// One-off backfill: sets imageUrl on existing Sku rows for the real SAB
// brand logos, so products already in the production DB (seeded before
// these were added) pick them up without a full re-seed.
// Safe to re-run — it only ever sets these specific known names.
//
// Exported as backfillBrandImages() so it can run on server boot
// (server/index.js) in addition to standalone via:
//   node server/scripts/backfill-brand-images.js
import prisma from '../config/db.js';

const BRAND_IMAGES = {
  // Black Label, Castle Lager/Lite/Milk Stout, Corona, Flying Fish (both),
  // Stella Artois, Hansa Pilsener, Lion Lager, Amstel Lager and Guinness
  // Foreign Extra used to be here, pointing at generic brand-logo badges —
  // not real product photos. Superseded by real retailer photos sourced
  // in alcohol-image-sources.json / backfill-alcohol-photos.js; removed
  // from here so this boot-time backfill can't overwrite them back to the
  // deleted logo files on the next deploy.
  //
  // A second wave went the same way: Brutal Fruit, Redd's (both), Three
  // Ships, Cointreau, Viceroy, 4th Street (both), Amarula (both), Bernini
  // and Count Pushkin were a plain text/wordmark logo card with no bottle
  // in it at all — pulled from here and the files deleted, rather than left
  // showing a photo that isn't an actual product shot.
  'Hennessy VS': 'hennessy-vs',
  'Hennessy VSOP': 'hennessy-vsop',
  // These nine had a real bottle photo too, just buried inside the same
  // oversized black canvas frame, off-angle, against a colored lifestyle
  // background rather than plain white (and a couple originally caught a
  // second bottle in frame). Recropped to isolate just the labeled product —
  // background isn't studio-white, but the bottle itself is correct, sharp,
  // and unobstructed, which is the bar that matters most.
  'Glenfiddich 12 Year': 'glenfiddich-12',
  'Jose Cuervo Especial Silver': 'jose-cuervo-especial-silver',
  'Jose Cuervo Especial Reposado': 'jose-cuervo-especial-reposado',
  'Remy Martin VSOP': 'remy-martin-vsop',
  'Remy Martin 1738 Accord Royal': 'remy-martin-1738',
  'Russian Bear Standard': 'russian-bear-standard',
  'Russian Bear Flavours': 'russian-bear-flavours',
  'Strettons London Dry': 'strettons-london-dry',
  'Strettons Wild Berry': 'strettons-wild-berry',
};

export async function backfillBrandImages() {
  let totalUpdated = 0;
  for (const [name, slug] of Object.entries(BRAND_IMAGES)) {
    const { count } = await prisma.sku.updateMany({
      where: { name },
      data: { imageUrl: `/images/brands/${slug}.png` },
    });
    totalUpdated += count;
  }
  if (totalUpdated > 0) {
    console.log(`Brand image backfill: ${totalUpdated} row(s) updated.`);
  }
  return totalUpdated;
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  backfillBrandImages()
    .then((count) => console.log(`Done. ${count} row(s) updated.`))
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
