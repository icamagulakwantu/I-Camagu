// Targeted, idempotent image repair for the products explicitly flagged in the
// October 2026 SmartMatch visual audit. This changes imageUrl only; it never
// changes SKU names, pack sizes, prices, quantities, or orders. The referenced
// files are committed under public/images/brands/ and served by the app.
import prisma from '../config/db.js';

const REQUESTED_PRODUCT_IMAGES = [
  { names: ['Honor VS'], image: 'honor-vs.png' },
  { names: ['Strettons London Dry'], image: 'strettons-london-dry.png' },
  { names: ['Strettons Wild Berry'], image: 'strettons-wild-berry.png' },
  { names: ['Baileys Irish Cream', 'Baileys Original Irish Cream'], image: 'baileys-original-irish-cream.png' },
  { names: ['Jose Cuervo Especial Silver'], image: 'jose-cuervo-especial-silver.png' },
  { names: ['Jose Cuervo Especial Reposado'], image: 'jose-cuervo-especial-reposado.png' },
  { names: ['Glenfiddich 12', 'Glenfiddich 12 Year'], image: 'glenfiddich-12.png' },
  { names: ['J&B', 'J&B Rare'], image: 'jb-rare.png' },
  { names: ['Jameson Select Reserve'], image: 'jameson-select-reserve.png' },
  { names: ['Johnnie Walker Red Label'], image: 'johnnie-walker-red-label.png' },
  { names: ['Glenlivet', 'The Glenlivet 12 Year'], image: 'the-glenlivet-12.png' },
  { names: ['Russian Bear', 'Russian Bear Standard'], image: 'russian-bear-standard.png' },
  { names: ['Russian Bear Flavours'], image: 'russian-bear-flavours.png' },
  { names: ['Banana Liqueur (Butlers)'], image: 'butlers-banana.png' },
  { names: ['Blue Curacao (Butlers)'], image: 'butlers-blue-curacao.png' },
  { names: ['Cherry Kirsch Liqueur (Butlers)'], image: 'butlers-cherry-kirsch.png' },
  { names: ['Espresso/Coffee Liqueur (Butlers)'], image: 'butlers-espresso.png' },
  { names: ['Ginger Liqueur (Butlers)'], image: 'butlers-ginger-liqueur.png' },
  { names: ['Peppermint Liqueur (Butlers)'], image: 'butlers-peppermint.png' },
  { names: ['Strawberry Liqueur (Butlers)'], image: 'butlers-strawberry.png' },
  { names: ['Triple Sec (Butlers)'], image: 'butlers-triple-sec.png' },
  { names: ['Van Der Hum Tangerine (Butlers)'], image: 'butlers-van-der-hum.png' },
];

export async function backfillRequestedProductImages() {
  let updated = 0;
  for (const entry of REQUESTED_PRODUCT_IMAGES) {
    for (const name of entry.names) {
      const result = await prisma.sku.updateMany({
        where: { name },
        data: { imageUrl: `/images/brands/${entry.image}` },
      });
      updated += result.count;
    }
  }
  if (updated) console.log(`Requested product image audit: corrected ${updated} SKU row(s).`);
  return updated;
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  backfillRequestedProductImages()
    .then((count) => console.log(`Done. ${count} SKU row(s) updated.`))
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
