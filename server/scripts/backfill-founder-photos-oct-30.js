// Founder photo round, 30 Oct 2026. Every photo was checked by eye for the
// brand, flavour and pack shape (dumpy vs quart vs can vs bottle) before
// being assigned. Photos are hosted on the Hercules CDN (permanent URLs, no
// hotlink blocking), which also replaces the Captain's packshots that never
// rendered because that site blocks hotlinking.
//
// Rules kept from earlier image scripts:
//   - Beer/cider photos are matched on name + pack type, so a quart photo
//     never lands on a dumpy row (and the other way round).
//   - Spirit packshots are 750ml bottles, so they only go on 750ml rows;
//     other sizes of the same name are cleared to the safe placeholder.
//   - New rows are created without a price ("not yet orderable") until a
//     real supplier price is set. They copy category/type from a sibling row.
//   - Only imageUrl is written on existing rows, and only when it differs,
//     so this is safe to run on every boot.
import prisma from '../config/db.js';
import { upsertSkuByNameAndBottleFormat } from '../utils/upsertSku.js';

const CDN = (id) => `https://hercules-cdn.com/file_${id}`;

// Products the founder has confirmed exist (with a real photo) but that had
// no row. Black Label dumpy was removed earlier as "not sold in SA"; the
// founder has since sent a real Black Label dumpy photo and asked for it.
const NEW_ROWS = [
  { name: 'Black Label', bottleFormat: 'Dumpy (330ml)', unitsPerCase: 24, cloneFrom: { name: 'Black Label' } },
  { name: 'Sol', bottleFormat: 'Dumpy (330ml)', unitsPerCase: 24, cloneFrom: { name: 'Sol' } },
  { name: 'Strettons Triple Berry', bottleFormat: '750ml Bottle', unitsPerCase: 12, cloneFrom: { name: 'Strettons London Dry' } },
  { name: 'Strettons Ruby Orange', bottleFormat: '750ml Bottle', unitsPerCase: 12, cloneFrom: { name: 'Strettons London Dry' } },
  { name: 'Imbola (Red Clay)', bottleFormat: null, unitsPerCase: 1, cloneFrom: { name: { contains: 'Bentonite' } } },
];

// The founder's soft-drink photos are 300ml plastic bottles, not cans, so
// they get their own Bottle (300ml) row instead of sitting on the can rows.
const SOFT_DRINK_BOTTLES = [
  { match: 'Coca-Cola', id: '2AmaliLyyClHz1Rp9XgrZU8j' },
  { match: 'Sprite', id: 'WWauzRKvXqkSZa7RZEiI2x9X' },
  { match: 'Fanta', id: 'qgXEU78onEFa719yrug54lvn' },
  { match: 'Stoney', id: 'IJqB3i3Q7rApkVuNxiyo0z12' },
];
const SOFT_DRINK_BOTTLE_FORMAT = 'Bottle (300ml)';

// format: text the row's pack type must contain. null = every pack type
// (for products where the pack doesn't change what it looks like).
// only750: spirit packshot, clear other bottle sizes of the same name.
const PHOTOS = [
  // Beer and cider, by exact pack type.
  { names: ['Castle Lager'], format: 'Dumpy', id: 'wiZ71gKYDbzmonFNkE1Ac9Yz' },
  { names: ['Castle Lite'], format: 'Dumpy', id: 'gsdsx0aArNYDrLemANz6KzXz' },
  { names: ['Castle Milk Stout'], format: 'Quart', id: 'Wqi6eumd7RW8btGlRvopq41C' },
  { names: ['Hansa Pilsener'], format: 'Quart', id: 'UUpEiGHNQR7onNStYLyVEvaH' },
  { names: ['Amstel Lager'], format: 'Quart', id: 'UjoK1Cl0aJOnBnFE2XnoaDEq' },
  { names: ['Flying Fish Lemon'], format: 'Quart', id: 'i7S3S5BFlORxMM3eVbMn2Q9M' },
  { names: ['Flying Fish Chill'], format: 'Dumpy', id: 'vZ72Fnoxw52cGP85Ac2ZZqhh' },
  { names: ['Black Label'], format: 'Dumpy', id: 'wzaa11jrab5bJHhiQKewsJQm' },
  { names: ['Sol'], format: 'Dumpy', id: 'wMEeCaFMeegfa9heO8TPxoXv' },
  { names: ['Windhoek Lager'], format: 'Dumpy', id: 'vi0015h9ifrtEuisi5lNHyuI' },
  { names: ['Windhoek Draught'], format: 'Quart', id: 'pWfyhuDWsMQIHB3IpGzV2o2V' },
  { names: ['Stella Artois'], format: 'Quart', id: 'IwQLtyHRzFBVachGc6TkWUe6' },
  { names: ["Hunter's Gold"], format: 'Dumpy', id: 'EFvLNOtDVy2wJqwHKufoRuGR' },
  { names: ['Brutal Fruit Ruby Apple'], format: 'Dumpy', id: 'PuYfgbiyqUrZlN3uRnViyPqs' },
  { names: ["Hunter's Iced Apple"], format: 'Can', id: 'g0yDZ2deN6XF0ji9986uTkp0' },
  { names: ["Hunter's Iced Watermelon"], format: 'Can', id: 'vNQB3pktLvXd4ndndoBUkHZI' },

  // Spirits and liqueurs: 750ml packshots.
  { names: ['The Glenlivet 12 Year', 'Glenlivet'], format: '750ml', only750: true, id: 'agIeFrCsKMIaa8A4FeebARby' },
  { names: ['Johnnie Walker Red Label'], format: '750ml', only750: true, id: 'bVmhHUOcUq4e7GLi1grRfzoH' },
  { names: ['Jameson Select Reserve'], format: '750ml', only750: true, id: 'fPaOxnmbuVcjlteRn8m78svO' },
  { names: ['J&B Rare', 'J&B'], format: '750ml', only750: true, id: 'sxGjN3HEmYc6K9idysvRY2W9' },
  { names: ['Glenfiddich 12 Year', 'Glenfiddich 12'], format: '750ml', only750: true, id: '4bPJ1WoaXaUfqmTwJi2j9oUY' },
  { names: ['Russian Bear Flavours'], format: '750ml', only750: true, id: '133DIRrJjCDa8FWGHEJ9KSlm' },
  { names: ['Russian Bear Standard', 'Russian Bear'], format: '750ml', only750: true, id: 'PEoHeC1agaiYtwgLVkS14HXO' },
  { names: ['Jose Cuervo Especial Reposado'], format: '750ml', only750: true, id: 'IqqxCHTuP47kEPks7ZeBkAjO' },
  { names: ['Jose Cuervo Especial Silver'], format: '750ml', only750: true, id: 'nRpXk0LfpbHK44Kl7Od3CMNT' },
  { names: ['Triple Sec (Butlers)'], format: '750ml', only750: true, id: '8j9e3XJKbKyuzhaeZ04hcF8w' },
  { names: ['Strawberry Liqueur (Butlers)'], format: '750ml', only750: true, id: 'EuLJrq3pRWGKkpoKH1EG2MZ8' },
  { names: ['Blue Curacao (Butlers)'], format: '750ml', only750: true, id: 'lD23QaXoByhsigci93tQ8Iuk' },
  { names: ['Ginger Liqueur (Butlers)'], format: '750ml', only750: true, id: 'TqaWP06xQLkA4XE7V3aw1nl9' },
  { names: ['Banana Liqueur (Butlers)'], format: '750ml', only750: true, id: 'TGltBPheotRowOijWjPxPLrp' },
  { names: ['Baileys Original Irish Cream', 'Baileys Irish Cream'], format: '750ml', only750: true, id: 'bpqmS7XBsQvI4rh6xyJ56Onl' },
  { names: ['Hennessy VS'], format: '750ml', only750: true, id: 'NttJtoAaQpwucdn7XYbKizlM' },
  { names: ['Strettons London Dry'], format: '750ml', only750: true, id: 'Ch2aeNo10pNVKmoyRvFPl2Vm' },
  { names: ['Strettons Wild Berry'], format: '750ml', only750: true, id: 'UN8S1Fz6M8apcaELYO6mwXDw' },
  { names: ['Strettons Triple Berry'], format: '750ml', only750: true, id: 's2kFHkADPnB1td9r6cf18nFl' },
  { names: ['Strettons Ruby Orange'], format: '750ml', only750: true, id: '1RiVHLFL4ctD73StunX3tjww' },

  // Meat, clothing and ceremony supplies: same look in every pack.
  { names: ['Whole Chicken'], format: null, id: 'XPFTde3NRaR0itfh1NJ8HuQ2' },
  { names: ['Chicken Trays'], format: null, id: 'c7TK0RMBga1tw4532ity5fFh' },
  { names: ['Chicken Legs'], format: null, id: 'lOQzQKzOOqqZJDRo0Hud5w1z' },
  { names: ['Boerewors'], format: null, id: '8FUj7MmJc6jp2CDWnqmRZNui' },
  { names: ['Beef Mince'], format: null, id: 'g1mWtMJDLMW4HBZRaaxfiL6G' },
  { names: ['Golf Shirt'], format: null, id: 'lyygCsQ54wPL5kLHxNRsXJi9' },
  { names: ['25L Water Container'], format: null, id: 'l8lR4cpx1epRtYK7MhV6xtdp' },
  { names: ['Imphepho Bundle', 'Imphepho'], format: null, id: 'BOeW7LyMwOAj5uOFUEBVgBUn' },
  { names: ['Ikoto (Bentonite Clay)', 'Bentonite Clay'], format: null, id: 'qDCKN4IdgjganfbfL51tndbR' },
  { names: ['Imbola (Red Clay)'], format: null, id: 'twpWtVbEmZAkpKhzhMMtsnIc' },
  { names: ['Plain Grey Blanket'], format: null, id: 'K8h7M5NRAWFQomMBBC4Fkf1K' },
  { names: ['White Blanket with Black Stripes'], format: null, id: 'wWg6TY8EOXaauUnyTSlRBPwZ' },
  { names: ['Tarpaulin Sail'], format: null, id: 'JvOoqPXJQD7TNd5wMyMM1LYh' },
  { names: ['Ibhoma Pole Bundle'], format: null, id: 'ywHYGgy7frFBxVEtokjJIsmx' },
];

const differentImage = (imageUrl) => [{ imageUrl: null }, { imageUrl: { not: imageUrl } }];

// Copies the fields that decide where and how a product shows in the Store,
// never its price.
function cloneFields(base) {
  return {
    category: base.category,
    productType: base.productType,
    bulkUnit: base.bulkUnit ?? undefined,
    bulkUnitPlural: base.bulkUnitPlural ?? undefined,
    supplierPortfolio: base.supplierPortfolio ?? undefined,
  };
}

async function ensureRow(base, name, bottleFormat, unitsPerCase) {
  await upsertSkuByNameAndBottleFormat(
    prisma,
    { ...cloneFields(base), name, bottleFormat, unitsPerCase, casePriceZAR: null },
    {},
  );
}

async function ensureNewRows() {
  for (const row of NEW_ROWS) {
    const base = await prisma.sku.findFirst({ where: row.cloneFrom });
    if (!base) {
      console.warn(`Founder photos: no sibling row to copy for "${row.name}"; skipped.`);
      continue;
    }
    await ensureRow(base, row.name, row.bottleFormat, row.unitsPerCase);
  }
}

async function applySoftDrinkBottles() {
  let updated = 0;
  for (const { match, id } of SOFT_DRINK_BOTTLES) {
    const base = await prisma.sku.findFirst({ where: { name: { contains: match }, category: 'SOFT_DRINKS' } });
    if (!base) continue;
    await ensureRow(base, base.name, SOFT_DRINK_BOTTLE_FORMAT, 24);
    const imageUrl = CDN(id);
    const result = await prisma.sku.updateMany({
      where: { name: base.name, bottleFormat: SOFT_DRINK_BOTTLE_FORMAT, OR: differentImage(imageUrl) },
      data: { imageUrl },
    });
    updated += result.count;
  }
  return updated;
}

async function applyPhotos() {
  let updated = 0;
  for (const { names, format, only750, id } of PHOTOS) {
    const imageUrl = CDN(id);
    const result = await prisma.sku.updateMany({
      where: {
        name: { in: names },
        ...(format && { bottleFormat: { contains: format } }),
        OR: differentImage(imageUrl),
      },
      data: { imageUrl },
    });
    updated += result.count;
    if (only750) {
      const others = await prisma.sku.updateMany({
        where: { name: { in: names }, NOT: { bottleFormat: { contains: '750ml' } }, imageUrl: { not: null } },
        data: { imageUrl: null },
      });
      updated += others.count;
    }
  }
  return updated;
}

export async function backfillFounderPhotosOct30() {
  await ensureNewRows();
  const updated = (await applySoftDrinkBottles()) + (await applyPhotos());
  if (updated) console.log(`Founder photo round (30 Oct): ${updated} SKU image(s) updated.`);
  return updated;
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  backfillFounderPhotosOct30()
    .then((count) => console.log(`Done. ${count} SKU row(s) updated.`))
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
