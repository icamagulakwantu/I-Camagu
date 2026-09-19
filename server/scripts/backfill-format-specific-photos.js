// Every other photo backfill in this codebase matches by Sku.name alone,
// so one photo ends up applied to every bottleFormat variant of that name
// (a Castle Lager quart, dumpy and can all show the same bottle shot). For
// most products a representative photo is good enough — but where the
// founder has sent an actual photo of the specific pack format, this one
// matches on (name, bottleFormat) instead so each format gets its own real
// photo rather than sharing one.
//
// Idempotent — safe to run on every boot.
import prisma from '../config/db.js';

const FORMAT_SPECIFIC_IMAGES = [
  // The founder already sent a bottle shot for Heineken's Quart (500ml),
  // applied to all three formats when it arrived. These two replace the
  // Can and Dumpy rows with their own actual pack-format photo; Quart keeps
  // the original bottle shot untouched.
  { name: 'Heineken', bottleFormat: 'Can (500ml)', slug: 'heineken-can' },
  { name: 'Heineken', bottleFormat: 'Dumpy (340ml)', slug: 'heineken-dumpy' },
  // Windhoek Lager's can; the bottle shot (windhoek-lager.png, matched by
  // name in backfill-extracted-brand-photos.js) already covers Quart/Dumpy.
  { name: 'Windhoek Lager', bottleFormat: 'Can (500ml)', slug: 'windhoek-lager-can' },
  // Windhoek Draught and Stella Artois already had a real bottle photo
  // (windhoek-draught.png / stella-artois.png) covering every format by
  // name; these give their Can row its own actual can photo instead.
  { name: 'Windhoek Draught', bottleFormat: 'Can (500ml)', slug: 'windhoek-draught-can' },
  { name: 'Stella Artois', bottleFormat: 'Can (500ml)', slug: 'stella-artois-can' },
  // Flavour-split products (split-bundled-flavour-skus.js) — their default
  // photo (set by name in backfill-extracted-brand-photos.js) is the bottle
  // shot; these give the Can row its own actual can photo where one exists.
  { name: 'Brutal Fruit Ruby Apple', bottleFormat: 'Can (500ml)', slug: 'brutal-fruit-ruby-apple-can' },
  { name: 'Brutal Fruit Strawberry Rouge', bottleFormat: 'Can (500ml)', slug: 'brutal-fruit-strawberry-rouge-can' },
  { name: 'Breezer Watermelon', bottleFormat: 'Can (500ml)', slug: 'breezer-watermelon-can' },
  { name: 'Breezer Blackberry', bottleFormat: 'Can (500ml)', slug: 'breezer-blackberry-can' },
  { name: 'Bernini Classic', bottleFormat: 'Can (500ml)', slug: 'bernini-classic-can' },
  { name: 'Bernini Blush', bottleFormat: 'Can (500ml)', slug: 'bernini-blush-can' },
  { name: 'Kopparberg Pear', bottleFormat: 'Can (500ml)', slug: 'kopparberg-pear-can' },
  { name: 'Kopparberg Strawberry & Lime', bottleFormat: 'Can (500ml)', slug: 'kopparberg-strawberry-lime-can' },
  { name: "Redd's Original", bottleFormat: 'Can (500ml)', slug: 'redds-original-can' },
  { name: "Redd's Berry", bottleFormat: 'Can (500ml)', slug: 'redds-berry-can' },
  { name: "Hunter's Gold", bottleFormat: 'Can (500ml)', slug: 'hunters-gold-can' },
  { name: 'Flying Fish Chill', bottleFormat: 'Can (500ml)', slug: 'flying-fish-chill-can' },
  { name: 'Extreme Energy', bottleFormat: 'Can (500ml)', slug: 'extreme-energy-can' },
  // Savanna Dry's big returnable bottle (fix-savanna-dry-format.js corrected
  // it from a wrong 750ml to the real 500ml) gets its own photo, distinct
  // from the Dumpy bottle shot that's the default for the name.
  { name: 'Savanna Dry', bottleFormat: 'Quart (500ml)', slug: 'savanna-dry-quart' },
  { name: 'Savanna Dry', bottleFormat: 'Can (500ml)', slug: 'savanna-dry-can' },
  // Lion Lager's bottle shot (backfill-brand-images.js, matched by name)
  // already covers the Quart; this gives the Can its own real can photo.
  { name: 'Lion Lager', bottleFormat: 'Can (500ml)', slug: 'lion-lager-can' },
  // Hunter's Dry's bottle shot (default, matched by name) was standing in
  // for the Can too until a real can photo arrived.
  { name: "Hunter's Dry", bottleFormat: 'Can (500ml)', slug: 'hunters-dry-can' },
];

export async function backfillFormatSpecificPhotos() {
  let totalUpdated = 0;
  for (const { name, bottleFormat, slug } of FORMAT_SPECIFIC_IMAGES) {
    const { count } = await prisma.sku.updateMany({
      where: { name, bottleFormat },
      data: { imageUrl: `/images/brands/${slug}.png` },
    });
    totalUpdated += count;
  }
  if (totalUpdated > 0) {
    console.log(`Format-specific photo backfill: ${totalUpdated} row(s) updated.`);
  }
  return totalUpdated;
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  backfillFormatSpecificPhotos()
    .then((count) => console.log(`Done. ${count} row(s) updated.`))
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
