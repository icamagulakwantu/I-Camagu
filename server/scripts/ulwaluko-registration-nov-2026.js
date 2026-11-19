// Adds the two newer registration steps (the CoGTA forms from the ward
// councillor's office, and the two medical examinations) to ulwaluko plans
// that have not started yet, once. Plans already under way are left alone:
// these steps come before the boy goes.
import prisma from '../config/db.js';
import { ULWALUKO_REGISTRATION_ITEMS } from '../controllers/ceremonyCostProfiles.js';

export const FIX_NAME = 'ulwaluko-registration-2026-11-20';
const NEW_LABELS = ULWALUKO_REGISTRATION_ITEMS.filter((i) => /CoGTA|Medical examination/.test(i.label));

export async function addUlwalukoRegistrationSteps({ now = new Date() } = {}) {
  if (await prisma.dataFix.findUnique({ where: { name: FIX_NAME } })) return { added: 0, skipped: true };
  const ceremonies = await prisma.ceremony.findMany({
    where: { type: 'ULWALUKO', OR: [{ eventDate: null }, { eventDate: { gt: now } }] },
    select: { id: true, checklistItems: { select: { label: true } } },
  });
  let added = 0;
  for (const ceremony of ceremonies) {
    const have = new Set(ceremony.checklistItems.map((i) => i.label));
    const missing = NEW_LABELS.filter((i) => !have.has(i.label));
    if (missing.length) {
      added += (await prisma.ceremonyChecklistItem.createMany({
        data: missing.map((i) => ({ ceremonyId: ceremony.id, phase: i.phase, label: i.label, isCompleted: false })),
      })).count;
    }
  }
  await prisma.dataFix.create({ data: { name: FIX_NAME } });
  if (added) console.log(`Ulwaluko registration: ${added} step(s) added to upcoming plans.`);
  return { added, skipped: false };
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  addUlwalukoRegistrationSteps()
    .then((r) => console.log('Done.', r))
    .catch((err) => { console.error(err); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
}
