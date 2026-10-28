// Targeted, idempotent image repair for products explicitly flagged in the
// October 2026 SmartMatch visual audit. The committed packshots are approved
// for 750ml bottle variants only. Never assign a 750ml image to a 375ml/other
// SKU: clear the image for unmatched sizes so the Store shows its safe
// placeholder until a matching packshot is verified. This changes imageUrl only.
import prisma from '../config/db.js';

const REQUESTED_PRODUCT_IMAGES = [
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

// Exact 300ml can packshots sourced from Norman Goodfellows product pages.
// These URLs identify the individual can, not a mixed case or a different volume.
// Source pages: https://ngf.co.za/products/coke-can-300ml,
// https://ngf.co.za/products/fanta-orange-can-300ml,
// https://ngf.co.za/products/sprite-can-300ml,
// https://www.ngf.co.za/product/stoney-ginger-beer-can-300ml/
const VERIFIED_SOFT_DRINK_IMAGES = [
  { nameContains: 'Coca-Cola', category: 'SOFT_DRINKS', format: '300ml', imageUrl: 'https://ngf.co.za/cdn/shop/files/coke-can-300ml.jpg?v=1790155408&width=1200' },
  { nameContains: 'Fanta Orange', category: 'SOFT_DRINKS', format: '300ml', imageUrl: 'https://ngf.co.za/cdn/shop/files/fanta-orange-can-300ml.jpg?v=1790155408&width=1200' },
  { nameContains: 'Sprite', category: 'SOFT_DRINKS', format: '300ml', imageUrl: 'https://ngf.co.za/cdn/shop/files/sprite-can-300ml.jpg?v=1790158666&width=1200' },
  { nameContains: 'Stoney', category: 'SOFT_DRINKS', format: '300ml', imageUrl: 'https://www.ngf.co.za/wp-content/uploads/2023/11/wp-image-32261396005047-scaled-1.jpg' },
];

async function backfillVerifiedSoftDrinkImages() {
  let updated = 0;
  let quarantined = 0;
  for (const entry of VERIFIED_SOFT_DRINK_IMAGES) {
    const result = await prisma.sku.updateMany({
      where: { name: { contains: entry.nameContains }, category: entry.category, bottleFormat: { contains: entry.format }, OR: [{ imageUrl: null }, { imageUrl: { not: entry.imageUrl } }] },
      data: { imageUrl: entry.imageUrl },
    });
    updated += result.count;

    // The checked-in grocery seed CSV labels these four cans as 250ml, while
    // the pricing TSV labels them 300ml. Until the live pack size is reconciled,
    // never display a 300ml image against a 250ml SKU. Hide the image rather
    // than silently claim a match; the Store renders its safe placeholder.
    const unverified250ml = await prisma.sku.updateMany({
      where: { name: { contains: entry.nameContains }, category: entry.category, bottleFormat: { contains: '250ml' }, imageUrl: { not: null } },
      data: { imageUrl: null },
    });
    quarantined += unverified250ml.count;
  }
  console.log(`Soft-drink image audit: ${updated} verified 300ml SKU image(s) set; ${quarantined} unverified 250ml image(s) cleared pending pack-size reconciliation.`);
  return updated + quarantined;
}

export async function backfillRequestedProductImages() {
  let updated = await backfillVerifiedSoftDrinkImages();
  for (const entry of REQUESTED_PRODUCT_IMAGES) {
    for (const name of entry.names) {
      const result = await prisma.sku.updateMany({
        where: { name, bottleFormat: { contains: '750ml' }, OR: [{ imageUrl: null }, { imageUrl: { not: `/images/brands/${entry.image}` } }] },
        data: { imageUrl: `/images/brands/${entry.image}` },
      });
      updated += result.count;

      // The approved local asset is a 750ml packshot. Do not reuse it for
      // smaller/larger bottles or any other pack format without a verified
      // matching image.
      const unmatchedVariants = await prisma.sku.updateMany({
        where: { name, NOT: { bottleFormat: { contains: '750ml' } }, imageUrl: { not: null } },
        data: { imageUrl: null },
      });
      updated += unmatchedVariants.count;
    }
  }
  // The old local Honor VS image is cropped and includes unrelated artwork.
  // This retailer packshot is explicitly the standalone 750ml Honor VS bottle.
  const honorVs = await prisma.sku.updateMany({
    where: { name: 'Honor VS', bottleFormat: { contains: '750ml' }, OR: [{ imageUrl: null }, { imageUrl: { not: 'https://thedrinkshopsa.com/cdn/shop/files/honorvs.jpg?v=1749290413&width=1080' } }] },
    data: { imageUrl: 'https://thedrinkshopsa.com/cdn/shop/files/honorvs.jpg?v=1749290413&width=1080' },
  });
  updated += honorVs.count;
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
