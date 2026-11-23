// Proper product photos for Bulk Buy (founder, 23 Nov 2026: "bulk buying
// must use proper images", like a real shop). Products that had no photo get
// the shop's own packshot: found on Checkers and Shoprite (Sixty60) with
// TinyFish, copied to i-Camagu's Cloudinary account, and delivered trimmed to
// the product and centred on a white square, the same style as the drinks.
// Only the same product and pack (one unit for a case of them); fresh
// produce shows the produce. Where a price names its brand (Tastic rice, ACE
// samp, Snowflake flour) the photo is that brand. Only rows with no photo
// are touched; runs once.
import prisma from '../config/db.js';

export const FIX_NAME = 'product-photos-2026-11-23';
const BASE = 'https://res.cloudinary.com/fuhfi2ft/image/upload';
const STYLE = 'e_trim/b_white,c_pad,h_540,w_540/b_white,c_pad,h_600,w_600/f_auto/q_auto';
export const photoUrl = (slug) => `${BASE}/${STYLE}/icamagu/products/${slug}`;

// [name, bottleFormat (null where the row has none), photo, what it shows]
export const PRODUCT_PHOTOS = [
  ["Maize Meal", "10kg Bag", "maize-meal-10kg-bag", "White Star Super Maize Meal 10kg (Shoprite)"],
  ["Maize Meal", "12.5kg Bag", "maize-meal-12-5kg-bag", "White Star Super Maize Meal 12.5kg (Shoprite)"],
  ["Sugar", "10kg Bag", "sugar-10kg-bag", "Huletts White Sugar 10kg (Shoprite)"],
  ["Flour", "10kg Bag", "flour-10kg-bag", "Snowflake Cake Wheat Flour 10kg (Shoprite)"],
  ["Flour", "12.5kg Bag", "flour-12-5kg-bag", "Snowflake Cake Wheat Flour 12.5kg (Shoprite)"],
  ["Cooking Oil", "5L", "cooking-oil-5l", "Sunfoil Pure Sunflower Seed Oil 5L (Shoprite)"],
  ["Pilchards in Tomato Sauce", "Case of 12 x 400g Tins", "pilchards-in-tomato-sauce-case-of-12-x-400g-tins", "Lucky Star Pilchards in Tomato Sauce 12 x 400g (Checkers)"],
  ["Jungle Oats", "Case of 10 x 1kg", "jungle-oats-case-of-10-x-1kg", "Jungle Oats 1kg (Checkers)"],
  ["Rice", "10kg Bag", "rice-10kg-bag", "Tastic Long Grain Parboiled White Rice 10kg (Shoprite)"],
  ["Samp", "10kg Bag", "samp-10kg-bag", "ACE Samp 10kg (Shoprite)"],
  ["Milk Long Life", "1L x 6-Pack", "milk-long-life-1l-x-6-pack", "Clover Ultra UHT Long Life Full Cream Milk 6 x 1L (Shoprite)"],
  ["Peanut Butter", "Case of 6 x 800g Jars", "peanut-butter-case-of-6-x-800g-jars", "Black Cat Smooth Peanut Butter 800g (Shoprite)"],
  ["Peanut Butter 400g", null, "peanut-butter-400g", "Black Cat Smooth Peanut Butter 400g (Shoprite)"],
  ["Ricoffy Coffee", "750g Tin", "ricoffy-coffee-750g-tin", "Nescafe Ricoffy 750g (Shoprite)"],
  ["Apricot Jam", "Case of 6 x 900g Jars", "apricot-jam-case-of-6-x-900g-jars", "All Gold Smooth Apricot Jam 900g (Checkers)"],
  ["Tea Bags", "Box of 100 Tagless", "tea-bags-box-of-100-tagless", "Joko Strong Quality Teabags 100 Pack (Shoprite)"],
  ["Brown Bread Loaf", null, "brown-bread-loaf", "Albany Superior Brown Bread 700g (Shoprite)"],
  ["Onions", "10kg Sack", "onions-10kg-sack", "Onions (Shoprite)"],
  ["Carrots", "10kg Sack", "carrots-10kg-sack", "Carrots bag (Shoprite)"],
  ["Eggs", "Tray of 30 Large", "eggs-tray-of-30-large", "Ritebrand Large Eggs 30 Pack (Shoprite)"],
  ["Cabbage", "Box (Bulk)", "cabbage-box-bulk", "Large Cabbage Head (Checkers)"],
  ["Chicken Portions", "5kg Box (Mixed Portions)", "chicken-portions-5kg-box-mixed-portions", "County Fair Frozen Chicken Mixed Portions 5kg (Shoprite)"],
  ["Green Peppers", "Box (Bulk)", "green-peppers-box-bulk", "Green Peppers (Shoprite)"],
  ["Spinach", "Box (Bulk Bunches)", "spinach-box-bulk-bunches", "Spinach Bunch (Shoprite)"],
  ["Sweet Corn", "Box (Bulk)", "sweet-corn-box-bulk", "Sweetcorn (Shoprite)"],
  ["Green Apples", "Box (Bulk)", "green-apples-box-bulk", "Granny Smith Apples (Shoprite)"],
  ["Potatoes", "10kg Sack", "potatoes-10kg-sack", "Potatoes bag (Shoprite)"],
  ["Mayonnaise", "Case of 12 x 750g Jars", "mayonnaise-case-of-12-x-750g-jars", "Crosse & Blackwell Tangy Mayonnaise 750g (Shoprite)"],
  ["Washing Powder", "5kg Bag (Hand Wash)", "washing-powder-5kg-bag-hand-wash", "MAQ Hi Foam Hand Washing Powder 5kg (Shoprite)"],
  ["Beef Mince 5kg", null, "beef-mince-5kg", "Lean Beef Mince bulk pack (Checkers)"],
  ["Red Peppers", "Box (Bulk)", "red-peppers-box-bulk", "Red Pepper (Checkers)"],
  ["Yellow Peppers", "Box (Bulk)", "yellow-peppers-box-bulk", "Yellow Pepper (Checkers)"],
  ["Bonaqua Sparkling Water", "Bottle (500ml)", "bonaqua-sparkling-water-bottle-500ml", "Bonaqua Sparkling Prepared Water 500ml (Checkers)"],
  ["Bonaqua Still Water", "Bottle (1.5L)", "bonaqua-still-water-bottle-1-5l", "Bonaqua Still Prepared Water 1.5L (Shoprite)"],
  ["Valpre Sparkling Water", "Bottle (500ml)", "valpre-sparkling-water-bottle-500ml", "Valpre Sparkling Spring Water 500ml (Shoprite)"],
  ["Valpre Still Water", "Bottle (500ml)", "valpre-still-water-bottle-500ml", "Valpre Still Spring Water 500ml (Checkers)"],
  ["Tsitsikamma Sparkling Water", "Bottle (1L)", "tsitsikamma-sparkling-water-bottle-1l", "Tsitsikamma Sparkling Water 1L (Shoprite)"],
  ["Tsitsikamma Still Water", "Bottle (1L)", "tsitsikamma-still-water-bottle-1l", "Tsitsikamma Still Spring Water 1L (Shoprite)"],
];

export async function addProductPhotos(list = PRODUCT_PHOTOS, fixName = FIX_NAME) {
  if (await prisma.dataFix.findUnique({ where: { name: fixName } })) return { added: 0, skipped: true };
  let added = 0;
  for (const [name, bottleFormat, slug] of list) {
    const { count } = await prisma.sku.updateMany({
      where: { name, bottleFormat, imageUrl: null, retiredAt: null },
      data: { imageUrl: photoUrl(slug) },
    });
    added += count;
  }
  await prisma.dataFix.create({ data: { name: fixName } });
  if (added) console.log(`Product photos: ${added} product(s) now have the shop's photo.`);
  return { added, skipped: false };
}

// Chillers Punch comes in 440 ml cans: the packshots already on these rows
// say 440 ml, and the shops sell them that size (founder, 23 Nov 2026:
// "they should be like the shop sells"). The four can rows listed as 500 ml
// are resized, unless a 440 ml row already exists. Runs once.
export const CHILLERS_FIX = 'chillers-punch-440ml-2026-11-23';
export const CHILLERS = ['Chillers Punch Caribbean Chaos', 'Chillers Punch Milano Spritz', 'Chillers Punch Peach & Mango', 'Chillers Punch Tequila Sunrise (Zero Alcohol)'];

export async function fixChillersCans(names = CHILLERS, fixName = CHILLERS_FIX) {
  if (await prisma.dataFix.findUnique({ where: { name: fixName } })) return { resized: 0, skipped: true };
  let resized = 0;
  for (const name of names) {
    const sku = await prisma.sku.findFirst({ where: { name, bottleFormat: 'Can (500ml)' } });
    if (!sku || await prisma.sku.findFirst({ where: { name, bottleFormat: 'Can (440ml)' } })) continue;
    await prisma.sku.update({ where: { id: sku.id }, data: { bottleFormat: 'Can (440ml)' } });
    resized += 1;
  }
  await prisma.dataFix.create({ data: { name: fixName } });
  if (resized) console.log(`Chillers Punch: ${resized} can row(s) now 440 ml.`);
  return { resized, skipped: false };
}

// Second round (founder, 23 Nov 2026: "fix that chicken image"): the old
// chicken photos are replaced with the shops' packshots, and three more
// groceries get theirs. A replaced photo is changed only while it is still
// the old one. Runs once.
export const FIX_NAME_2 = 'product-photos-2026-11-23-chicken';
export const REPLACE_PHOTOS = [
  // [name, bottleFormat, old photo it replaces, new photo]
  ['Whole Chicken', 'Box (Bulk, ~1.8kg each bird)', 'https://hercules-cdn.com/file_XPFTde3NRaR0itfh1NJ8HuQ2', 'whole-chicken'],
  ['Chicken Trays', 'Box (Bulk)', 'https://hercules-cdn.com/file_c7TK0RMBga1tw4532ity5fFh', 'chicken-trays-box-bulk'],
];
export const MORE_PHOTOS = [
  ['Mayonnaise', '3kg Tub', 'mayonnaise-3kg-tub', 'Crosse & Blackwell Tangy Mayonnaise 3kg (Shoprite)'],
  ['Maize Meal', '50kg Bag', 'maize-meal-50kg-bag', 'White Star Super Maize Meal 50kg (Checkers)'],
  ['Sugar', '12.5kg Bag', 'sugar-12-5kg-bag', 'Huletts White Sugar 12.5kg (Shoprite)'],
];

export async function replaceChickenPhotos() {
  if (await prisma.dataFix.findUnique({ where: { name: FIX_NAME_2 } })) return { changed: 0, skipped: true };
  let changed = 0;
  for (const [name, bottleFormat, oldUrl, slug] of REPLACE_PHOTOS) {
    const { count } = await prisma.sku.updateMany({ where: { name, bottleFormat, imageUrl: oldUrl }, data: { imageUrl: photoUrl(slug) } });
    changed += count;
  }
  await prisma.dataFix.create({ data: { name: FIX_NAME_2 } });
  const more = await addProductPhotos(MORE_PHOTOS, `${FIX_NAME_2}-more`);
  if (changed) console.log(`Product photos: ${changed} chicken photo(s) replaced.`);
  return { changed, added: more.added, skipped: false };
}
