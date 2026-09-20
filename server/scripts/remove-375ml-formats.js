// The founder decided iCamagu won't carry a 375ml ("half-jack") size for
// any spirit — every alcohol brand that had one alongside its 750ml row
// loses the smaller format entirely, not just the ones missing a photo.
// No live basket referenced any of these at the time this was written.
//
// Same mechanics as remove-nonexistent-formats.js — deleteMany on a
// (name, bottleFormat) pair that's already gone is a no-op, so this is
// safe to leave running on every boot.
import prisma from '../config/db.js';

const REMOVED_375ML_FORMATS = [
  { name: 'Jameson Original Irish', category: 'WHISKY' },
  { name: 'Johnnie Walker Red Label', category: 'WHISKY' },
  { name: 'Johnnie Walker Black Label', category: 'WHISKY' },
  { name: "Jack Daniel's Old No.7", category: 'WHISKY' },
  { name: "Jack Daniel's Tennessee Honey", category: 'WHISKY' },
  { name: 'J&B Rare', category: 'WHISKY' },
  { name: 'Bells Extra Special', category: 'WHISKY' },
  { name: 'Chivas Regal 12 Year Old', category: 'WHISKY' },
  { name: "Bain's Cape Mountain", category: 'WHISKY' },
  { name: 'Scottish Leader Original', category: 'WHISKY' },
  { name: 'Three Ships 5 Year Old', category: 'WHISKY' },
  { name: 'Hennessy VS', category: 'COGNAC' },
  { name: 'Honor VS', category: 'COGNAC' },
  { name: 'Strettons London Dry', category: 'GIN' },
  { name: 'Strettons Wild Berry', category: 'GIN' },
  { name: 'Old Buck Gin', category: 'GIN' },
  { name: 'Gordons Pink Berry', category: 'GIN' },
  { name: 'Gordons London Dry', category: 'GIN' },
  { name: 'Royal Flush Premium', category: 'GIN' },
  { name: 'Tanqueray London Dry Export', category: 'GIN' },
  { name: "Hendrick's Original", category: 'GIN' },
  { name: 'Bombay Sapphire', category: 'GIN' },
  { name: 'Belvedere Pure Vodka', category: 'VODKA_PREMIUM' },
  { name: 'Ciroc Original Premium', category: 'VODKA_PREMIUM' },
  { name: 'Smirnoff Red No. 21', category: 'VODKA' },
  { name: 'Russian Bear Standard', category: 'VODKA' },
  { name: 'Wyborowa Vodka', category: 'VODKA' },
  { name: 'Grey Goose Luxury', category: 'VODKA_PREMIUM' },
  { name: 'Absolut Original Blue', category: 'VODKA' },
  { name: 'Cruz Vintage Black Vodka', category: 'VODKA' },
  { name: 'Skyy Vodka Original', category: 'VODKA' },
  { name: 'Count Pushkin Vodka', category: 'VODKA' },
  { name: 'Olmeca Plata', category: 'TEQUILA' },
  { name: 'Olmeca Reposado', category: 'TEQUILA' },
  { name: 'Jose Cuervo Especial Silver', category: 'TEQUILA' },
  { name: 'Jose Cuervo Especial Reposado', category: 'TEQUILA' },
  { name: 'Aljimardo Silver', category: 'TEQUILA' },
  { name: 'Ponchos Blanco Tequila', category: 'TEQUILA' },
  { name: 'Ponchos Caramel Tequila', category: 'TEQUILA' },
];

export async function remove375mlFormats() {
  let removed = 0;
  for (const { name } of REMOVED_375ML_FORMATS) {
    const { count } = await prisma.sku.deleteMany({ where: { name, bottleFormat: '375ml Bottle' } });
    removed += count;
  }
  if (removed > 0) console.log(`375ml format removal: ${removed} row(s) deleted.`);
  return removed;
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  remove375mlFormats()
    .then((count) => console.log(`Done. ${count} row(s) deleted.`))
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
