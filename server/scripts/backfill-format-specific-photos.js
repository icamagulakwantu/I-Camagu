// Every other photo backfill in this codebase matches by Sku.name alone,
// so one photo ends up applied to every bottleFormat variant of that name
// (a Castle Lager quart, dumpy and can all show the same bottle shot). For
// most products a representative photo is good enough — but where the
// founder has sent an actual photo of the specific pack format, this one
// matches on (name, bottleFormat) instead so each format gets its own real
// photo rather than sharing one.
//
// Idempotent — safe to run on every boot.
import prisma from '../config/db.js';

const FORMAT_SPECIFIC_IMAGES = [
  // The founder already sent a bottle shot for Heineken's Quart (500ml),
  // applied to all three formats when it arrived. These two replace the
  // Can and Dumpy rows with their own actual pack-format photo; Quart keeps
  // the original bottle shot untouched.
  { name: 'Heineken', bottleFormat: 'Can (500ml)', slug: 'heineken-can' },
  { name: 'Heineken', bottleFormat: 'Dumpy (340ml)', slug: 'heineken-dumpy' },
];

export async function backfillFormatSpecificPhotos() {
  let totalUpdated = 0;
  for (const { name, bottleFormat, slug } of FORMAT_SPECIFIC_IMAGES) {
    const { count } = await prisma.sku.updateMany({
      where: { name, bottleFormat },
      data: { imageUrl: `/images/brands/${slug}.png` },
    });
    totalUpdated += count;
  }
  if (totalUpdated > 0) {
    console.log(`Format-specific photo backfill: ${totalUpdated} row(s) updated.`);
  }
  return totalUpdated;
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  backfillFormatSpecificPhotos()
    .then((count) => console.log(`Done. ${count} row(s) updated.`))
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
