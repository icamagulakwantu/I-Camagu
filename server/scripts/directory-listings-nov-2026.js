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
