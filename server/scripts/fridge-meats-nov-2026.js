// Fridge products for Bulk Buy (founder, 23 Nov 2026): a grocery stokvel of
// 14 members bought these together from a food-service wholesaler (Bidfood
// quote, Dec 2023). They are added to Meat so a group can buy them the same
// way, at today's prices.
//
// Bulk price: a wholesaler's case price including VAT, read on 23 Nov 2026
// (TinyFish). Shelf price: what a shop asks for the same amount. VERIFIED
// only where the shop sells the same kind of product and we read its regular
// price; otherwise ESTIMATE, which members never see as a saving. Photos are
// the shops' packshots copied to i-Camagu's Cloudinary account; "photo" says
// what each one shows. Only adds what is missing; runs once.
import prisma from '../config/db.js';
import { photoUrl } from './product-photos-nov-2026.js';

export const FIX_NAME = 'fridge-meats-2026-11-23';
const CHECKED_AT = new Date('2026-11-23T12:00:00Z');

export const FRIDGE_PRODUCTS = [
  {
    name: 'Burger Patties', bottleFormat: 'Box of 20 x 90g', unitsPerCase: 1, bulkUnit: 'box', bulkUnitPlural: 'boxes',
    casePriceZAR: 74.77, bulkSource: 'Grocery Express, Juicy PB burger patties 20 x 90g R74.77 incl VAT',
    retailPriceZAR: 129.99, retailPriceSource: 'VERIFIED', retailSource: "Shoprite, Farmer Joe's Frozen Delicious Burgers 20 x 90g R129.99",
    slug: 'burger-patties-box-of-20-x-90g', photo: "Farmer Joe's Frozen Delicious Burgers 20 x 90g (Shoprite)",
  },
  {
    name: 'Russians', bottleFormat: 'Case of 5 x 1kg (Short)', unitsPerCase: 5, bulkUnit: 'case', bulkUnitPlural: 'cases',
    casePriceZAR: 442.57, bulkSource: "Grocery Express, Frey's short catering Russians 5 x 1kg R442.57 incl VAT",
    retailPriceZAR: 593.69, retailPriceSource: 'ESTIMATE', retailSource: "Frey's Premium Short Russians 800g R94.99 (Econo Foods catalogue), per kg x 5: catalogue price, not a regular shelf read",
    slug: 'russians-case-of-5-x-1kg-short', photo: "Frey's short catering Russians 5 x 1kg (Grocery Express)",
  },
  {
    name: 'Cheese Grillers', bottleFormat: 'Case of 12 x 500g', unitsPerCase: 12, bulkUnit: 'case', bulkUnitPlural: 'cases',
    casePriceZAR: 665.21, bulkSource: 'Grocery Express, Eskort cheese grillers 12 x 500g R665.21 incl VAT',
    retailPriceZAR: 1079.88, retailPriceSource: 'VERIFIED', retailSource: 'Checkers, Eskort Woodsmoked Cheese Grillers 500g regular R89.99 (Shoprite R79.99), x 12',
    slug: 'cheese-grillers-case-of-12-x-500g', photo: 'Eskort Woodsmoked Cheese Grillers 500g (Shoprite)',
  },
  {
    name: 'Bacon', bottleFormat: 'Case of 6 x 1kg (Back)', unitsPerCase: 6, bulkUnit: 'case', bulkUnitPlural: 'cases',
    casePriceZAR: 555.64, bulkSource: 'Grocery Express, Lynca back bacon 6 x 1kg R555.64 incl VAT',
    retailPriceZAR: 1439.94, retailPriceSource: 'ESTIMATE', retailSource: 'Pick n Pay, Eskort Rindless Back Bacon 1kg R239.99 (Sep 2026), x 6: a dearer brand than the bulk bacon',
    slug: 'bacon-case-of-6-x-1kg-back', photo: 'Eskort Rindless Back Bacon 1kg (Pick n Pay)',
  },
  {
    name: 'French Polony', bottleFormat: '3kg Loaf', unitsPerCase: 1, bulkUnit: 'loaf', bulkUnitPlural: 'loaves',
    casePriceZAR: 79.05, bulkSource: 'Watsons Meat, French Polony 3kg R79.05 each (20 or more)',
    retailPriceZAR: 143.97, retailPriceSource: 'VERIFIED', retailSource: 'Pick n Pay, Eskort French Polony 1kg R47.99 (Shoprite R44.99), x 3',
    slug: 'french-polony-3kg-loaf', photo: 'Eskort French Polony large loaf (eskort.com)',
  },
  {
    name: 'Ham & Tongue Loaf', bottleFormat: '2kg Loaf', unitsPerCase: 1, bulkUnit: 'loaf', bulkUnitPlural: 'loaves',
    casePriceZAR: 91.99, bulkSource: "Striker Meat, Brito's Ham & Tongue Loaf 2kg R91.99",
    retailPriceZAR: 189.98, retailPriceSource: 'VERIFIED', retailSource: "Dave's Meat Market, ham & tongue R94.99 per kg, x 2",
    slug: 'ham-and-tongue-loaf-2kg-loaf', photo: "Brito's Ham & Tongue Loaf 2kg (Striker Meat)",
  },
];

export async function addFridgeMeats() {
  if (await prisma.dataFix.findUnique({ where: { name: FIX_NAME } })) return { added: 0, skipped: true };
  let added = 0;
  for (const { bulkSource, retailSource, slug, photo, ...p } of FRIDGE_PRODUCTS) {
    const exists = await prisma.sku.findFirst({ where: { name: p.name, bottleFormat: p.bottleFormat } });
    if (exists) continue;
    await prisma.sku.create({
      data: {
        ...p,
        category: 'MEAT',
        productType: 'FOOD',
        imageUrl: photoUrl(slug),
        retailPriceCheckedAt: CHECKED_AT,
        retailPriceNote: `${retailSource}. Bulk: ${bulkSource}. Checked 23 Nov 2026.`,
      },
    });
    added += 1;
  }
  await prisma.dataFix.create({ data: { name: FIX_NAME } });
  if (added) console.log(`Fridge meats: ${added} product(s) added to Bulk Buy.`);
  return { added, skipped: false };
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  addFridgeMeats()
    .then((r) => console.log('Done.', r))
    .catch((err) => { console.error(err); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
}
