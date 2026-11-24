// A potential meat vendor (founder, 24 Nov 2026: "checkout that sammeatsneeds
// page it's a potential vendor"). From the business's own TikTok profile and
// advert (@sammeatsneeds, 100k followers): 5kg bags of pork for R350, paid in
// full with the order, collected in KwaDwesi or delivered in Port Elizabeth
// and Uitenhage. Only the business's public trading contacts are kept. The
// pork is listed at their own price (no shop price to compare, so no saving
// is claimed); the photo is the founder's crop of their advert. Runs once.
import prisma from '../config/db.js';
import { addVendors } from './directory-listings-nov-2026.js';

export const FIX_NAME = 'sam-meats-2026-11-24';

export const SAM_MEATS = {
  name: 'Sam Meat Needs',
  category: 'MEAT_SUPPLIER',
  area: 'KwaDwesi, Port Elizabeth',
  contactInfo: '065 881 9224 · 074 988 8589 (WhatsApp or call) · TikTok @sammeatsneeds',
  description: 'Pork in 5kg bags (R350 a bag, Nov 2026). Orders are paid in full when placed. Collect in KwaDwesi or delivery in Port Elizabeth and Uitenhage. Open Monday to Friday 09:00-17:00, Saturday 09:00-13:00, closed Sunday.',
};

export const PORK = {
  name: 'Pork',
  bottleFormat: '5kg Bag',
  category: 'MEAT',
  productType: 'FOOD',
  unitsPerCase: 1,
  casePriceZAR: 350,
  bulkUnit: 'bag',
  bulkUnitPlural: 'bags',
  imageUrl: '/images/meat/pork-5kg-bags-2.jpg',
  retailPriceNote: 'Sam Meat Needs (KwaDwesi, PE), 5kg pork R350, their advert, Nov 2026. No shop price to compare.',
};

export async function addSamMeats() {
  if (await prisma.dataFix.findUnique({ where: { name: FIX_NAME } })) return { skipped: true };
  const vendors = await addVendors([SAM_MEATS]);
  let products = 0;
  if (!(await prisma.sku.findFirst({ where: { name: PORK.name, bottleFormat: PORK.bottleFormat } }))) {
    await prisma.sku.create({ data: PORK });
    products = 1;
  }
  await prisma.dataFix.create({ data: { name: FIX_NAME } });
  if (vendors || products) console.log(`Sam Meat Needs: ${vendors} vendor, ${products} product added.`);
  return { vendors, products, skipped: false };
}
