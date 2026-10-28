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
  // The founder already sent a bottle shot for Heineken's Quart, applied to
  // all three formats when it arrived. These two replace the Can and Dumpy
  // rows with their own actual pack-format photo; Quart keeps the original
  // bottle shot untouched. Dumpy is 330ml (fix-pack-sizes-oct-2026.js).
  { name: 'Heineken', bottleFormat: 'Can (500ml)', slug: 'heineken-can' },
  { name: 'Heineken', bottleFormat: 'Dumpy (330ml)', slug: 'heineken-dumpy' },
  // Windhoek Lager's can; the bottle shot (windhoek-lager.png, matched by
  // name in backfill-extracted-brand-photos.js) already covers Quart/Dumpy.
  { name: 'Windhoek Lager', bottleFormat: 'Can (500ml)', slug: 'windhoek-lager-can' },
  // Windhoek Draught and Stella Artois already had a real bottle photo
  // (windhoek-draught.png / stella-artois.png) covering every format by
  // name; these give their Can row its own actual can photo instead.
  // Windhoek Draught's can is 440ml (fix-pack-sizes-oct-2026.js).
  { name: 'Windhoek Draught', bottleFormat: 'Can (440ml)', slug: 'windhoek-draught-can' },
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
  // Every Hunter's can is 440ml (fix-pack-sizes-oct-2026.js).
  { name: "Hunter's Gold", bottleFormat: 'Can (440ml)', slug: 'hunters-gold-can' },
  { name: 'Flying Fish Chill', bottleFormat: 'Can (500ml)', slug: 'flying-fish-chill-can' },
  { name: 'Extreme Energy', bottleFormat: 'Dumpy (330ml)', slug: 'extreme-energy' },
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
  { name: "Hunter's Dry", bottleFormat: 'Can (440ml)', slug: 'hunters-dry-can' },
  // Renamed/new rows (rename-mislabeled-skus.js, backfill-founder-sourced-
  // skus.js) — bottle shot is each name's default, Can/Dumpy formats get
  // their own actual pack-format photo.
  { name: "Hunter's Iced Apple", bottleFormat: 'Can (440ml)', slug: 'hunters-iced-apple-can' },
  { name: "Hunter's Iced Watermelon", bottleFormat: 'Can (440ml)', slug: 'hunters-iced-watermelon-can' },
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
  { name: 'Amstel Lager', bottleFormat: 'Quart (750ml)', slug: 'amstel-lager' },
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

// Retailer packshots hosted externally, matched on (name, bottleFormat) so
// each pack size shows its own bottle/can. Applied AFTER the local slugs
// above, so these win for the rows they list.
//
// Captain's (shop.captains.co.za) photos: one packshot per pack size, each
// checked visually on 28 Oct 2026 against its exact format (quart vs dumpy
// vs can). NOTE: Captain's blocks hotlinking, so these do not render on our
// site — the founder is supplying replacements, which should be hosted on
// the Hercules CDN like the water photos below.
// Captain's lists several quarts as 660ml (Castle Lite, Amstel, Hunter's,
// Strongbow); the bottle shape is right, but the 750ml catalogue label may
// need a separate size check.
// Amstel Quart keeps the founder's own photo (amstel-lager.png) above.
const CAPTAINS = 'https://shop.captains.co.za/product/image/large/';
// Founder-supplied photos hosted on the Hercules CDN (permanent URLs, no
// hotlink blocking). Each was checked by eye for brand, still vs sparkling
// and printed size before being assigned; photos whose size couldn't be
// read from the label were NOT assigned to any row.
const CDN = 'https://hercules-cdn.com/';
const EXTERNAL_FORMAT_SPECIFIC_IMAGES = [
  // This verified South African retailer packshot is specifically the 500ml
  // can, not the 330ml NRB bottle.
  {
    name: 'Hansa Pilsener',
    bottleFormat: 'Can (500ml)',
    imageUrl: 'https://res.cloudinary.com/agrimark/image/upload/v1645439722/uploads/assets/597-HP-500ml-can-render-225d1a.png',
  },
  { name: 'Castle Lager', bottleFormat: 'Quart (750ml)', imageUrl: `${CAPTAINS}castlq750qz_1.jpg` },
  { name: 'Castle Lager', bottleFormat: 'Dumpy (330ml)', imageUrl: `${CAPTAINS}castln340_1.jpg` },
  { name: 'Castle Lite', bottleFormat: 'Quart (750ml)', imageUrl: `${CAPTAINS}caslq660qz_1.jpg` },
  { name: 'Castle Lite', bottleFormat: 'Dumpy (330ml)', imageUrl: `${CAPTAINS}casln340_1.png` },
  { name: 'Castle Milk Stout', bottleFormat: 'Quart (750ml)', imageUrl: `${CAPTAINS}stouq750qz_1.jpg` },
  { name: 'Castle Milk Stout', bottleFormat: 'Dumpy (330ml)', imageUrl: `${CAPTAINS}stoun340_1.jpg` },
  { name: 'Amstel Lager', bottleFormat: 'Dumpy (330ml)', imageUrl: `${CAPTAINS}amstn340_1.jpg` },
  { name: 'Hansa Pilsener', bottleFormat: 'Quart (750ml)', imageUrl: `${CAPTAINS}hansq750qz_1.jpg` },
  { name: 'Hansa Pilsener', bottleFormat: 'Dumpy (330ml)', imageUrl: `${CAPTAINS}hansn340_1.jpg` },
  { name: 'Stella Artois', bottleFormat: 'Quart (620ml)', imageUrl: `${CAPTAINS}stela620_1.jpg` },
  { name: 'Stella Artois', bottleFormat: 'Dumpy (330ml)', imageUrl: `${CAPTAINS}stella330_1.jpg` },
  { name: 'Windhoek Lager', bottleFormat: 'Quart (750ml)', imageUrl: `${CAPTAINS}windhlaq750qz_1.jpg` },
  { name: 'Windhoek Lager', bottleFormat: 'Dumpy (330ml)', imageUrl: `${CAPTAINS}windhlan340_1.png` },
  { name: 'Flying Fish Lemon', bottleFormat: 'Quart (660ml)', imageUrl: `${CAPTAINS}flyfpl660qz_1.jpg` },
  { name: 'Flying Fish Lemon', bottleFormat: 'Dumpy (330ml)', imageUrl: `${CAPTAINS}flyfpl330_1.jpg` },
  { name: "Hunter's Dry", bottleFormat: 'Quart (750ml)', imageUrl: `${CAPTAINS}huntdq660qz_1.jpg` },
  { name: "Hunter's Dry", bottleFormat: 'Dumpy (330ml)', imageUrl: `${CAPTAINS}huntdn340_1.jpg` },
  { name: "Hunter's Gold", bottleFormat: 'Quart (750ml)', imageUrl: `${CAPTAINS}huntgq660qz_1.jpg` },
  { name: "Hunter's Gold", bottleFormat: 'Dumpy (330ml)', imageUrl: `${CAPTAINS}huntgn340_1.jpg` },
  { name: 'Strongbow Gold Apple', bottleFormat: 'Quart (750ml)', imageUrl: `${CAPTAINS}strobgold660qz_1.png` },
  { name: 'Strongbow Gold Apple', bottleFormat: 'Dumpy (330ml)', imageUrl: `${CAPTAINS}strog330_1.png` },
  { name: 'Strongbow Red Berries', bottleFormat: 'Quart (750ml)', imageUrl: `${CAPTAINS}strobred660qz_1.png` },
  { name: 'Strongbow Red Berries', bottleFormat: 'Dumpy (330ml)', imageUrl: `${CAPTAINS}strober330_1.png` },
  { name: 'Brutal Fruit Ruby Apple', bottleFormat: 'Dumpy (330ml)', imageUrl: `${CAPTAINS}brutfra275_1.jpg` },
  { name: 'Brutal Fruit Strawberry Rouge', bottleFormat: 'Dumpy (330ml)', imageUrl: `${CAPTAINS}brutfsr275_1.jpg` },
  { name: 'Breezer Blueberry', bottleFormat: 'Dumpy (275ml)', imageUrl: `${CAPTAINS}bacbblb275_1.jpg` },
  // Water — founder-supplied photos (28 Oct 2026).
  { name: 'Valpre Still Water', bottleFormat: 'Bottle (500ml)', imageUrl: `${CDN}file_xHCC1xZIP6rImE2peq8q8X8g` },
  { name: 'Valpre Still Water', bottleFormat: 'Bottle (1.5L)', imageUrl: `${CDN}file_PI0C9ubaYB2NEkIoO6yVWi0B` },
  { name: 'Valpre Sparkling Water', bottleFormat: 'Bottle (500ml)', imageUrl: `${CDN}file_H1Bfr1jzX6vhZF32ujouaxHi` },
  { name: 'Valpre Sparkling Water', bottleFormat: 'Bottle (1L)', imageUrl: `${CDN}file_fQ0zaxCT4NfJilGVOGDVtAmx` },
  { name: 'Bonaqua Still Water', bottleFormat: 'Bottle (500ml)', imageUrl: `${CDN}file_jM0jztZR0cP3rZToV75X9lWF` },
  { name: 'Tsitsikamma Still Water', bottleFormat: 'Bottle (500ml)', imageUrl: `${CDN}file_VPNKAxGLTob9bEn0wwBj2hjl` },
  { name: 'Tsitsikamma Sparkling Water', bottleFormat: 'Bottle (500ml)', imageUrl: `${CDN}file_zrCLbbN9zkHKDCcahbf0nbp8` },
];

// Rows that previously pointed at a hotlink-blocked Captain's URL and have
// no verified replacement yet. Cleared to null so the store shows its
// normal "no photo" placeholder instead of a broken image.
const BROKEN_IMAGES_TO_CLEAR = [
  { name: 'Bonaqua Still Water', bottleFormat: 'Bottle (1.5L)', imageUrl: `${CAPTAINS}bona1.5lt_1.png` },
];

// Generic (non-branded) products that had NO photo at all. Unsplash photos
// (free licence, picked 28 Oct 2026) of the item itself — fine for produce,
// livestock and chicken where the brand/pack doesn't change what it looks
// like. Matched on (name, category) and ONLY applied where imageUrl is still
// null, so a real founder photo added later is never overwritten.
const unsplash = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=600&q=80`;
const MISSING_GENERIC_IMAGES = [
  { name: 'Cabbage', category: 'FRESH_PRODUCE', imageUrl: unsplash('1611105637889-3afd7295bdbf') },
  { name: 'Carrots', category: 'FRESH_PRODUCE', imageUrl: unsplash('1590868309235-ea34bed7bd7f') },
  { name: 'Green Apples', category: 'FRESH_PRODUCE', imageUrl: unsplash('1786212444902-ea8ef49815f5') },
  { name: 'Green Peppers', category: 'FRESH_PRODUCE', imageUrl: unsplash('1758221056967-52731a2dc935') },
  { name: 'Red Peppers', category: 'FRESH_PRODUCE', imageUrl: unsplash('1666213871235-422c5f80ceba') },
  { name: 'Yellow Peppers', category: 'FRESH_PRODUCE', imageUrl: unsplash('1730433267235-ed682d9346f9') },
  { name: 'Onions', category: 'FRESH_PRODUCE', imageUrl: unsplash('1518977956812-cd3dbadaaf31') },
  { name: 'Potatoes', category: 'FRESH_PRODUCE', imageUrl: unsplash('1790070194230-ac8c1d921b54') },
  { name: 'Spinach', category: 'FRESH_PRODUCE', imageUrl: unsplash('1574316071802-0d684efa7bf5') },
  { name: 'Sweet Corn', category: 'FRESH_PRODUCE', imageUrl: unsplash('1683543124257-1d214be3a366') },
  // Nguni-type cattle, matching the animals used for imigidi and other
  // ceremonies; applies to both Imazi and Inkabi rows.
  { name: 'Inkomo / Cow', category: 'LIVESTOCK_ANIMAL', imageUrl: unsplash('1694275856344-c3f131896954') },
  { name: 'Goat', category: 'LIVESTOCK_ANIMAL', imageUrl: unsplash('1611524159648-999101ef2b49') },
  { name: 'Sheep', category: 'LIVESTOCK_ANIMAL', imageUrl: unsplash('1683548919628-c0ce464f444d') },
  { name: 'Whole Chicken', category: 'MEAT', imageUrl: unsplash('1642102903909-560c5a7665bf') },
  { name: 'Chicken Trays', category: 'MEAT', imageUrl: unsplash('1759493321741-883fbf9f433c') },
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
  for (const { name, bottleFormat, imageUrl } of EXTERNAL_FORMAT_SPECIFIC_IMAGES) {
    const { count } = await prisma.sku.updateMany({
      where: { name, bottleFormat, NOT: { imageUrl } },
      data: { imageUrl },
    });
    totalUpdated += count;
  }
  for (const { name, bottleFormat, imageUrl } of BROKEN_IMAGES_TO_CLEAR) {
    const { count } = await prisma.sku.updateMany({
      where: { name, bottleFormat, imageUrl },
      data: { imageUrl: null },
    });
    totalUpdated += count;
  }
  for (const { name, category, imageUrl } of MISSING_GENERIC_IMAGES) {
    const { count } = await prisma.sku.updateMany({
      where: { name, category, imageUrl: null },
      data: { imageUrl },
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
