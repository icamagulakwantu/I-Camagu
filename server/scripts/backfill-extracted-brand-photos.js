// Applies the real product photos extracted from retailer app/flyer
// screenshots (Butlers, Monin, Ultra Liquors, and the Ultra Liquors
// broadsheet) to their matching Sku rows. Same mechanics as
// backfill-brand-images.js: a name -> slug map, applied unconditionally so a
// later, better photo can simply replace an entry here. Deliberately leaves
// out any Sku name that already had a real photo file in public/images/brands
// before this ran (Gordons London Dry, Hennessy VS, etc.) — this only fills
// genuine gaps, it never overwrites a photo someone already curated.
import prisma from '../config/db.js';

const EXTRACTED_BRAND_IMAGES = {
  'Strawberry Liqueur (Butlers)': 'butlers-strawberry',
  'Espresso/Coffee Liqueur (Butlers)': 'butlers-espresso',
  'Peppermint Liqueur (Butlers)': 'butlers-peppermint',
  'Cherry Kirsch Liqueur (Butlers)': 'butlers-cherry-kirsch',
  'Triple Sec (Butlers)': 'butlers-triple-sec',
  'Banana Liqueur (Butlers)': 'butlers-banana',
  'Blue Curacao (Butlers)': 'butlers-blue-curacao',
  'Monin Kiwi Syrup': 'monin-kiwi',
  'Jameson Original Irish': 'jameson-original-irish',
  'Old Buck Gin': 'old-buck-gin',
  'Commando Brandy': 'commando-brandy',
  // Seed data already pointed these two at /images/brands/castle-lager.png
  // and /images/brands/carling-black-label.png, but neither file actually
  // existed in the repo — broken image links until now.
  'Castle Lager': 'castle-lager',
  'Black Label': 'carling-black-label',
  'Castle Lite': 'castle-lite',
  'Windhoek Draught': 'windhoek-draught',
  'Savanna Dry/Light': 'savanna-dry',
  'Stella Artois': 'stella-artois',
  'Corona': 'corona',
  'Johnnie Walker Red Label': 'johnnie-walker-red-label',
  'J&B Rare': 'jb-rare',
  'Klipdrift Export': 'klipdrift-export',
  'Johnnie Walker Gold Label Reserve': 'johnnie-walker-gold-label',
  'Jameson Select Reserve': 'jameson-select-reserve',
  'Honor VS': 'honor-vs',
  'Ciroc Original Premium': 'ciroc-original',
  'Drostdy-Hof Claret Select': 'drostdy-hof-claret-select',
  'Sol': 'sol',
  'Heineken': 'heineken',
  'Hansa Pilsener': 'hansa-pilsener',
  'Lion Lager': 'lion-lager',
  'Extreme Energy': 'extreme-energy',
  'Belgravia G&T (Asstd)': 'belgravia-gt',
  'Flying Fish Lemon/Apple': 'flying-fish-lemon-apple',
  'Breezer (Red/Watermelon)': 'breezer',
  'Chillers Punch': 'chillers-punch',
  "Hunter's Chilled": 'hunters-chilled',
  'Windhoek Lager': 'windhoek-lager',
  'Amstel Lager': 'amstel-lager',
  'Castle Milk Stout': 'castle-milk-stout',
  'Guinness Foreign Extra': 'guinness-foreign-extra',
};

export async function backfillExtractedBrandPhotos() {
  let totalUpdated = 0;
  for (const [name, slug] of Object.entries(EXTRACTED_BRAND_IMAGES)) {
    const { count } = await prisma.sku.updateMany({
      where: { name },
      data: { imageUrl: `/images/brands/${slug}.png` },
    });
    totalUpdated += count;
  }
  if (totalUpdated > 0) {
    console.log(`Extracted brand photo backfill: ${totalUpdated} row(s) updated.`);
  }
  return totalUpdated;
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  backfillExtractedBrandPhotos()
    .then((count) => console.log(`Done. ${count} row(s) updated.`))
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
