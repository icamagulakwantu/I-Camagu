// Brings existing wedding and funeral (ukukhapha) plans up to date, once:
// weddings get the full umtshato plan (from ukucela and lobola to umdudo and
// ukuyalwa) and funerals get the mourning steps. Recorded in DataFix so an
// item a family later removes never comes back; only missing labels are
// added and ticks are kept.
import prisma from '../config/db.js';
import { WEDDING_DEFAULT_ITEMS, MOURNING_ITEMS } from '../controllers/ceremonyCostProfiles.js';

export const FIX_NAME = 'wedding-mourning-2026-11-20';
const ADD = { WEDDING: WEDDING_DEFAULT_ITEMS, UKUKHAPHA: MOURNING_ITEMS };

export async function updateWeddingAndMourningPlans() {
  if (await prisma.dataFix.findUnique({ where: { name: FIX_NAME } })) return { added: 0, skipped: true };
  let added = 0;
  for (const [type, items] of Object.entries(ADD)) {
    const ceremonies = await prisma.ceremony.findMany({ where: { type }, select: { id: true, checklistItems: { select: { label: true } } } });
    for (const ceremony of ceremonies) {
      const have = new Set(ceremony.checklistItems.map((i) => i.label));
      const missing = items.filter((i) => !have.has(i.label));
      if (missing.length) {
        added += (await prisma.ceremonyChecklistItem.createMany({
          data: missing.map((i) => ({ ceremonyId: ceremony.id, phase: i.phase, label: i.label, isCompleted: false })),
        })).count;
      }
    }
  }
  await prisma.dataFix.create({ data: { name: FIX_NAME } });
  if (added) console.log(`Wedding and mourning plans: ${added} checklist item(s) added.`);
  return { added, skipped: false };
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  updateWeddingAndMourningPlans()
    .then((r) => console.log('Done.', r))
    .catch((err) => { console.error(err); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
}
