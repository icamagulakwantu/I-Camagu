// Directory clean-up and first real listings, once.
//
// 1. Removes the four sample practitioners the development seed created
//    (made-up names with 555 phone numbers, one wrongly marked verified).
//    A family must never mistake a sample for a real ingcibi. Matched on
//    name and the 555 number, so a real listing is never touched.
// 2. Adds local businesses that publish their own details: Shwabz KwaSintu
//    (KwaDwesi, its own website and Facebook page, and Nelson Mandela Bay
//    Tourism's listing) and Libhongo Decor & Hire (Gqeberha, its website
//    names imigidi and traditional ceremonies). Families confirm or dispute
//    them like any other listing.
import prisma from '../config/db.js';

export const FIX_NAME = 'directory-listings-2026-11-20';

export const SAMPLE_PRACTITIONERS = [
  { name: "Bhut' Sizwe Ingcibi Services", contactInfo: '021 555 0101' },
  { name: 'Mama Noku Ikhankatha Care', contactInfo: '021 555 0102' },
  { name: 'Tata Zola Traditional Guidance', contactInfo: '041 555 0103' },
  { name: 'Nkosi Ingcibi Practice', contactInfo: '043 555 0104' },
];

export const LOCAL_VENDORS = [
  {
    name: 'Shwabz KwaSintu',
    category: 'TRADITIONAL_GOODS',
    area: 'KwaDwesi, Gqeberha',
    contactInfo: '067 947 9022 · shwabzkwasintu.co.za',
    description: 'Family-run shop for traditional occasions: beadwork, drums, imibhaco material and more. Mkwenkwe Street, across from Ziyabuya Mall.',
  },
  {
    name: 'Libhongo Decor & Hire',
    category: 'EQUIPMENT_HIRE',
    area: 'Gqeberha',
    contactInfo: 'libhongoevents.co.za',
    description: 'Tents, chairs, tables, cutlery and décor for imigidi, weddings and memorial services, within 200 km of Gqeberha.',
  },
];

// Adds each business unless one of the same name is already listed.
export async function addVendors(list) {
  let added = 0;
  for (const vendor of list) {
    const existing = await prisma.vendor.findFirst({ where: { name: { equals: vendor.name, mode: 'insensitive' } } });
    if (!existing) { await prisma.vendor.create({ data: vendor }); added += 1; }
  }
  return added;
}

export async function updateDirectoryListings() {
  if (await prisma.dataFix.findUnique({ where: { name: FIX_NAME } })) return { removed: 0, added: 0, skipped: true };
  let removed = 0;
  for (const sample of SAMPLE_PRACTITIONERS) {
    const rows = await prisma.practitioner.findMany({ where: sample, select: { id: true } });
    const ids = rows.map((r) => r.id);
    if (!ids.length) continue;
    await prisma.directoryVote.deleteMany({ where: { targetType: 'PRACTITIONER', targetId: { in: ids } } });
    removed += (await prisma.practitioner.deleteMany({ where: { id: { in: ids } } })).count;
  }
  const added = await addVendors(LOCAL_VENDORS);
  await prisma.dataFix.create({ data: { name: FIX_NAME } });
  if (removed || added) console.log(`Directory: ${removed} sample listing(s) removed, ${added} local business(es) added.`);
  return { removed, added, skipped: false };
}

// Second batch, found 20 Nov 2026 from the businesses' own public pages.
export const FIX_NAME_2 = 'directory-listings-2026-11-20b';
export const MORE_VENDORS = [
  {
    name: 'Siya Meals',
    category: 'CATERING',
    area: 'Gqeberha',
    contactInfo: '078 998 9093',
    description: 'Catering for all events in Gqeberha; quotes on WhatsApp.',
  },
  {
    name: 'Umbhaco',
    category: 'ATTIRE',
    area: 'Woodstock, Cape Town (delivers across SA)',
    contactInfo: '072 289 7959 · umbhaco.com',
    description: 'Umbhaco Xhosa attire in cotton with traditional beadwork, made to order.',
  },
];

export async function addMoreDirectoryListings() {
  if (await prisma.dataFix.findUnique({ where: { name: FIX_NAME_2 } })) return { added: 0, skipped: true };
  const added = await addVendors(MORE_VENDORS);
  await prisma.dataFix.create({ data: { name: FIX_NAME_2 } });
  if (added) console.log(`Directory: ${added} more local business(es) added.`);
  return { added, skipped: false };
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  updateDirectoryListings().then(() => addMoreDirectoryListings())
    .then((r) => console.log('Done.', r))
    .catch((err) => { console.error(err); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
}

// Third batch, 23 Nov 2026: hire companies for ceremonies at home in
// Gqeberha, from their own published pages and price lists (see
// shared/hire.js and docs/research/2026-11-hire-and-stokvels.md).
export const FIX_NAME_3 = 'directory-listings-2026-11-23-hire';
export const HIRE_VENDOR_LISTINGS = [
  {
    name: 'Tent Hire Wiz Port Elizabeth',
    category: 'EQUIPMENT_HIRE',
    area: 'Motherwell, Zwide, KwaZakhele, New Brighton, KwaDwesi, Bethelsdorp, Kwanobuhle',
    contactInfo: 'pe.tent-hirewiz.co.za',
    description: 'Tent, chairs and tables as one bundle for imigidi, umembeso and funerals, delivered, rigged and collected. 50 seats R1,800–R3,200; 100 seats R3,500–R6,000; kitchen gazebo from R850; mobile fridge R650–R1,200.',
  },
  {
    name: 'Extreme Hiring EC',
    category: 'EQUIPMENT_HIRE',
    area: 'Lorraine, Gqeberha',
    contactInfo: 'extremehiringec.co.za',
    description: 'Plastic chairs R7.50, trestle tables R45, 20 L urn R120, plate gas burner R350–R400, crockery and cutlery (price list of 17 Nov 2025). Delivery priced by area.',
  },
  {
    name: 'Red Cherry Events',
    category: 'EQUIPMENT_HIRE',
    area: 'North End, Gqeberha',
    contactInfo: 'redcherryevents.co.za',
    description: 'Tents from R650 and furniture from R100; delivery R12/km for the return trip.',
  },
];

export async function addHireListings() {
  if (await prisma.dataFix.findUnique({ where: { name: FIX_NAME_3 } })) return { added: 0, skipped: true };
  const added = await addVendors(HIRE_VENDOR_LISTINGS);
  await prisma.dataFix.create({ data: { name: FIX_NAME_3 } });
  if (added) console.log(`Directory: ${added} hire company(ies) added.`);
  return { added, skipped: false };
}

// Fourth batch, 23 Nov 2026: township hirers the founder found, from their
// own adverts (Google Maps, Facebook, Instagram). Bank details in adverts
// are left out on purpose.
export const FIX_NAME_4 = 'directory-listings-2026-11-23-township-hire';
export const TOWNSHIP_HIRE_LISTINGS = [
  {
    name: 'Tumi’s Tents and Equipment Hire (TMZ)',
    category: 'EQUIPMENT_HIRE',
    area: '192 Mpenzu Street, NU 7, Motherwell, Gqeberha',
    contactInfo: '074 216 7874 · 068 350 9214',
    description: 'Tents, chairs and deco; pots and gas stoves, plates and cutlery; toilet hire and catering (Hlelo15 Foods and Catering), for events of up to 500 people. Quote on request.',
  },
  {
    name: 'LiDa Pots Hire Hub',
    category: 'EQUIPMENT_HIRE',
    area: 'Port Elizabeth (free delivery)',
    contactInfo: '065 918 0834 (call or WhatsApp)',
    description: 'Hart pots for hire: 21 L, 36 L and 50 L; all three for R250 (special, Sep 2026). Cleaned and delivered free.',
  },
  {
    name: 'Lolwethu Thys Rental Services',
    category: 'EQUIPMENT_HIRE',
    area: 'Area to confirm',
    contactInfo: '067 667 1745 · thyslolwethu340@gmail.com',
    description: '4 big pots (2 × 21 L and others) R350; 4-burner gas stove with empty cylinder R350, with 4 pots R500, with 4 pots and 2 folding tables R700; folding trestle table R100.',
  },
  {
    name: 'Dima Events and Decor',
    category: 'EQUIPMENT_HIRE',
    area: 'Area to confirm',
    contactInfo: 'Della 064 083 3727 · Dima 078 747 5037 · Dmahloane@yahoo.com',
    description: 'Catering equipment since 2017: gas stove 3-plate R200, 2-plate R180; chafing dish R85; pots from R80; beverage dispenser from R40; dinner plate R5, side plate R3.50, bowl R4; plastic chair R6; trestle table R45; table cloth R45; grass mat from R250; medium trailer R450. What they don’t have they outsource.',
  },
];

export async function addTownshipHireListings() {
  if (await prisma.dataFix.findUnique({ where: { name: FIX_NAME_4 } })) return { added: 0, skipped: true };
  const added = await addVendors(TOWNSHIP_HIRE_LISTINGS);
  await prisma.dataFix.create({ data: { name: FIX_NAME_4 } });
  if (added) console.log(`Directory: ${added} township hirer(s) added.`);
  return { added, skipped: false };
}
