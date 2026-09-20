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
  // Renamed/new rows (rename-mislabeled-skus.js, backfill-founder-sourced-
  // skus.js) — bottle shot is each name's default, Can/Dumpy formats get
  // their own actual pack-format photo.
  { name: "Hunter's Iced Apple", bottleFormat: 'Can (500ml)', slug: 'hunters-iced-apple-can' },
  { name: "Hunter's Iced Watermelon", bottleFormat: 'Can (500ml)', slug: 'hunters-iced-watermelon-can' },
  { name: 'Strongbow Gold Apple', bottleFormat: 'Can (500ml)', slug: 'strongbow-gold-apple-can' },
  { name: 'Strongbow Red Berries', bottleFormat: 'Can (500ml)', slug: 'strongbow-red-berries-can' },
  { name: 'Smirnoff Storm Pine Twist', bottleFormat: 'Dumpy (250ml)', slug: 'smirnoff-storm-pine-twist-dumpy' },
  { name: 'Smirnoff Storm Citrus', bottleFormat: 'Dumpy (250ml)', slug: 'smirnoff-storm-citrus-dumpy' },
  // Corona's default photo (backfill-extracted-brand-photos.js) is its
  // 355ml Dumpy bottle; the corrected-size Can (fix-beer-quart-formats.js)
  // and the newly added 600ml bottle (backfill-founder-sourced-skus.js)
  // each get their own real, distinctly-shaped photo instead.
  { name: 'Corona', bottleFormat: 'Can (410ml)', slug: 'corona-can' },
  { name: 'Corona', bottleFormat: 'Quart (600ml)', slug: 'corona-600ml' },
  // Flying Fish Dry Apple's default (bottle) photo is set by name above;
  // its restored Can (500ml) row (backfill-founder-sourced-skus.js) gets
  // its own real can photo instead.
  { name: 'Flying Fish Dry Apple', bottleFormat: 'Can (500ml)', slug: 'flying-fish-dry-apple-can' },
  // Black Label's bottle shot (backfill-extracted-brand-photos.js, matched
  // by name) was standing in for the Can too — a real can photo turned up
  // in a full re-check of every photo sent this session, same fix as the
  // other Can-format entries above.
  { name: 'Black Label', bottleFormat: 'Can (500ml)', slug: 'carling-black-label-can' },
  // Same class of fix, next batch of real can/bottle photos the founder
  // sent after the Black Label check — each of these had its bottle shot
  // (or, for Budweiser, its can shot) standing in for every format.
  { name: 'Castle Lite', bottleFormat: 'Can (500ml)', slug: 'castle-lite-can' },
  { name: 'Amstel Lager', bottleFormat: 'Can (500ml)', slug: 'amstel-lager-can' },
  { name: 'Castle Milk Stout', bottleFormat: 'Can (500ml)', slug: 'castle-milk-stout-can' },
  // Budweiser's default (backfill-extracted-brand-photos.js) used to be its
  // Can photo, set outside any tracked backfill script — a real bottle
  // photo arrived and became the new default, so the Can now needs this
  // explicit override to keep its own real can photo.
  { name: 'Budweiser', bottleFormat: 'Can (500ml)', slug: 'budweiser-can' },
  { name: 'Belgravia Gin & Dry Lemon', bottleFormat: 'Can (500ml)', slug: 'belgravia-dry-lemon-can' },
  { name: "Redd's MXD Guarana", bottleFormat: 'Can (500ml)', slug: 'redds-mxd-guarana-can' },
  { name: "Redd's MXD Pine", bottleFormat: 'Can (500ml)', slug: 'redds-mxd-pine-can' },
  { name: 'Sol', bottleFormat: 'Can (500ml)', slug: 'sol-can' },
  // Third batch from the same full re-check.
  { name: 'Castle Lager', bottleFormat: 'Can (500ml)', slug: 'castle-lager-can' },
  { name: "Redd's Dry", bottleFormat: 'Can (500ml)', slug: 'redds-dry-can' },
  // Belgravia Gin & Dark Cherry's default (backfill-extracted-brand-
  // photos.js) is already its real Can photo; this gives the Dumpy row
  // its own real bottle photo instead of sharing the can shot.
  { name: 'Belgravia Gin & Dark Cherry', bottleFormat: 'Dumpy (275ml)', slug: 'belgravia-dark-cherry-bottle' },
  // Wine-box formats — their default photo (backfill-extracted-brand-
  // photos.js) is the bottle shot; these give the box its own real box
  // photo instead of sharing the bottle image.
  { name: '4th Street Sweet Red', bottleFormat: '5 Litre Box', slug: '4th-street-sweet-red-box' },
  { name: '4th Street Sweet White', bottleFormat: '5 Litre Box', slug: '4th-street-sweet-white-box' },
  { name: 'Drostdy-Hof Adelpracht Sweet', bottleFormat: '3 Litre Box', slug: 'drostdy-hof-adelpracht-box' },
  { name: "Sedgwick's Old Brown", bottleFormat: '2 Litre Box', slug: 'sedgwicks-old-brown-box' },
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
