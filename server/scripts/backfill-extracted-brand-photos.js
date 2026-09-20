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
  'Savanna Dry': 'savanna-dry',
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
  // Bundled name split (split-bundled-flavour-skus.js) — the photo actually
  // shows the Lemon flavour specifically, so it stays with that row; Apple
  // starts with no photo until one arrives.
  'Flying Fish Lemon': 'flying-fish-lemon-apple',
  // Seed data pointed this at flying-fish-chill.jpg, a file that did exist
  // but was a low-quality flyer crop; replaced with a real studio shot
  // (saved as .png, matching the convention every other entry here uses).
  'Flying Fish Chill': 'flying-fish-chill',
  "Hunter's Chilled": 'hunters-chilled',
  'Windhoek Lager': 'windhoek-lager',
  'Amstel Lager': 'amstel-lager',
  // Previously set by a direct manual write outside any tracked backfill
  // script (same anomaly class as Skyy Vodka/Absolut Watermelon earlier
  // this session) — now tracked properly, pointing at the real bottle
  // photo; the Can row's own photo lives in
  // backfill-format-specific-photos.js.
  'Budweiser': 'budweiser',
  'Castle Milk Stout': 'castle-milk-stout',
  'Guinness Foreign Extra': 'guinness-foreign-extra',
  'Wellington VO': 'wellington-vo',
  // A real bottle photo arrived after this was cleared for having a
  // text-only logo card — restored now with the actual product photo.
  'Viceroy 5 Year Old': 'viceroy',
  'Southern Comfort': 'southern-comfort',
  'Captain Morgan Spiced Gold': 'captain-morgan-spiced-gold',
  'Klipdrift Premium': 'klipdrift-premium',
  // Real bottle photos arrived after both were cleared earlier this session
  // for having a promo banner/colored background baked into their only
  // source photo — restored now with clean studio shots.
  'Moet & Chandon Imperial Brut': 'moet-chandon',
  'Veuve Clicquot Yellow Label': 'veuve-clicquot',
  // Bundled-name splits (split-bundled-flavour-skus.js) — each flavour gets
  // its own real photo instead of one shared across the old bundled name.
  'Brutal Fruit Ruby Apple': 'brutal-fruit-ruby-apple',
  'Brutal Fruit Strawberry Rouge': 'brutal-fruit-strawberry-rouge',
  'Breezer Blueberry': 'breezer-blueberry',
  'Breezer Watermelon': 'breezer-watermelon',
  'Breezer Blackberry': 'breezer-blackberry',
  'Bernini Classic': 'bernini-classic',
  'Bernini Blush': 'bernini-blush',
  'Belgravia Gin & Dark Cherry': 'belgravia-dark-cherry',
  'Belgravia Gin & Dry Lemon': 'belgravia-dry-lemon',
  'Kopparberg Pear': 'kopparberg-pear',
  'Kopparberg Strawberry & Lime': 'kopparberg-strawberry-lime',
  'Kopparberg Raspberry': 'kopparberg-raspberry',
  // Mixed Fruit only has a can photo — used as the default for every format.
  'Kopparberg Mixed Fruit': 'kopparberg-mixed-fruit-can',
  "Redd's Original": 'redds-original',
  "Redd's Berry": 'redds-berry',
  "Redd's Dry": 'redds-dry',
  "Redd's MXD Pine": 'redds-mxd-pine',
  "Redd's MXD Guarana": 'redds-mxd-guarana',
  "Hunter's Dry": 'hunters-dry',
  "Hunter's Gold": 'hunters-gold',
  // All four Chillers Punch flavours only have a can photo — used as the
  // default for every format (Can and Dumpy both).
  'Chillers Punch Milano Spritz': 'chillers-punch-milano-spritz',
  'Chillers Punch Caribbean Chaos': 'chillers-punch-caribbean-chaos',
  'Chillers Punch Tequila Sunrise (Zero Alcohol)': 'chillers-punch-tequila-sunrise-zero',
  'Chillers Punch Peach & Mango': 'chillers-punch-peach-mango',
  // These two photos were set on the old bundled row by a direct manual
  // write, not through this dict, so the split (which never copies
  // imageUrl) would otherwise drop them. Each photo shows one specific
  // flavour, so it stays with that row; the other flavours start bare.
  'Sambuca Lupini Black': 'sambuca-lupini-black-gold',
  'Absolut Watermelon': 'absolut-watermelon-lime-citron',
  // Renamed rows (rename-mislabeled-skus.js) and their real photos.
  'Strongbow Gold Apple': 'strongbow-gold-apple',
  'Strongbow Red Berries': 'strongbow-red-berries',
  'Smirnoff Storm Pine Twist': 'smirnoff-storm-pine-twist',
  'Smirnoff Storm Citrus': 'smirnoff-storm-citrus',
  // New products (backfill-founder-sourced-skus.js).
  "Hunter's Iced Apple": 'hunters-iced-apple',
  "Hunter's Iced Watermelon": 'hunters-iced-watermelon',
  'Kopparberg Sweet Vintage Pear': 'kopparberg-sweet-vintage-pear',
  'Brutal Fruit Spritzer Ruby Apple': 'brutal-fruit-spritzer-ruby-apple',
  'Bernini Ruby Berry': 'bernini-ruby-berry',
  'Savanna Angry Lemon': 'savanna-angry-lemon',
  'Hennessy XO': 'hennessy-xo',
  "D'USSE VSOP": 'dusse-vsop',
  'Courvoisier VS': 'courvoisier-vs',
  'Courvoisier VSOP': 'courvoisier-vsop',
  'Bisquit & Dubouche VSOP': 'bisquit-dubouche-vsop',
  'Bisquit & Dubouche XO': 'bisquit-dubouche-xo',
  'Flying Fish Dry Apple': 'flying-fish-dry-apple',
  'Brutal Fruit Spritzer Strawberry Rouge': 'brutal-fruit-spritzer-strawberry-rouge',
  // Gin round: real bottle photos for names that had none yet, plus the
  // Kwande split (split-bundled-flavour-skus.js) and Gordon's rename
  // (rename-mislabeled-skus.js) above.
  'Kwande Gin Rooibos': 'kwande-gin-rooibos',
  'Kwande Gin Witty': 'kwande-gin-witty',
  'Cruxland Gin': 'cruxland-gin',
  'Flowstone African Bush Botanical': 'flowstone-african-bush-botanical',
  'Wixworth Gin': 'wixworth-gin',
  'Inverroche Amber': 'inverroche-amber',
  'Royal Flush Premium': 'royal-flush-premium',
  'Tanqueray Flor de Sevilla': 'tanqueray-flor-de-sevilla',
  'Tanqueray No. TEN': 'tanqueray-no-ten',
  'Bombay Sapphire': 'bombay-sapphire',
  'Musgrave Pink': 'musgrave-pink',
  'KEM Gin': 'kem-gin',
  'Gordons Pink Berry': 'gordons-pink-berry',
  "Hendrick's Original": 'hendricks-original',
  // Tequila/vodka round: real bottle photos for names that had none yet,
  // plus the new Ponchos Tequila Coffee row (backfill-founder-sourced-
  // skus.js) above.
  'Ponchos Caramel Tequila': 'ponchos-caramel-tequila',
  'Ponchos Tequila Coffee': 'ponchos-tequila-coffee',
  'Martell Blue Swift VSOP': 'martell-blue-swift',
  'Patron Reposado': 'patron-reposado',
  'Casamigos Blanco': 'casamigos-blanco',
  'Olmeca Reposado': 'olmeca-reposado',
  'El Jimador Reposado': 'el-jimador-reposado',
  'El Jimador Blanco': 'el-jimador-blanco',
  'Ciroc Pineapple': 'ciroc-pineapple',
  'Ciroc Mango': 'ciroc-mango',
  'Ciroc Apple': 'ciroc-apple',
  'Count Pushkin Vodka': 'count-pushkin-vodka',
  'Wyborowa Vodka': 'wyborowa-vodka',
  'Smirnoff Red No. 21': 'smirnoff-red-no-21',
  // Liqueur round: real bottle photos for names that had none yet, the
  // Lupini Blue rename (rename-mislabeled-skus.js) and the new Amarula
  // Raspberry Chocolate Cream row (backfill-founder-sourced-skus.js) above.
  'Amarula Ethiopian Coffee': 'amarula-ethiopian-coffee',
  'Amarula Raspberry Chocolate Cream': 'amarula-raspberry-chocolate-cream',
  "Blue Curacao (Peddler's)": 'peddlers-blue-curacao',
  "Triple Sec (Peddler's)": 'peddlers-triple-sec',
  'Sambuca Lupini Blue': 'sambuca-lupini-blue',
  'Sambuca Lupini Gold': 'sambuca-lupini-gold',
  'Peach Schnapps (Relic)': 'relic-peach-schnapps',
  'Cape Velvet Cream': 'cape-velvet-cream',
  'Cointreau Orange Liqueur': 'cointreau-orange-liqueur',
  'Disaronno Amaretto Liqueur': 'disaronno-amaretto',
  'Frangelico Hazelnut Liqueur': 'frangelico-hazelnut',
  'Ginger Liqueur (Butlers)': 'butlers-ginger-liqueur',
  'Nachtmusik Chocolate Liqueur': 'nachtmusik-chocolate',
  'Tequila Rose Cream Liqueur': 'tequila-rose-cream',
  // Mixer round: real bottle photos for the Monin syrup range and the
  // Rose's cordials, plus Monin Cherry/Grenadine (backfill-monin-
  // syrups.js) above.
  'Passion Fruit Cordial': 'roses-passionfruit',
  'Kola Tonic Cordial': 'roses-kola-tonic',
  'Lime Cordial': 'roses-lime',
  'Monin White Chocolate': 'monin-white-chocolate',
  'Monin Lemon Tea / Citron': 'monin-lemon-tea',
  'Monin Spicy Mango': 'monin-spicy-mango',
  'Monin Melon': 'monin-melon',
  'Monin Lemon Pie / Tarte Citron': 'monin-lemon-pie',
  'Monin Crème Brûlée': 'monin-creme-brulee',
  'Monin Agave': 'monin-agave',
  'Monin Blue Curaçao Syrup': 'monin-curacao-bleu',
  'Monin Almond Orgeat': 'monin-orgeat-almond',
  'Monin Falernum': 'monin-falernum',
  'Monin Cherry': 'monin-cherry',
  'Monin Grenadine': 'monin-grenadine',
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
