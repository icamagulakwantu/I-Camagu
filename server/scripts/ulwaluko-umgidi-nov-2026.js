// Brings existing ulwaluko plans up to date with the founder's 19 Nov 2026
// changes, once: ulwaluko and umgidi are one plan, with registration and
// consent, the tools to build the ibhoma (ipeki, shovel, saw, hammer),
// ubukrwala, and the courtesy for the young men who burn the ibhoma.
//
// Runs once (recorded in DataFix), so an item a family later removes never
// comes back. Within the run it adds only items a plan does not already have
// (by label) and keeps every tick. Umgidi items are skipped for a host who
// already plans umgidi as its own ceremony, so nothing is doubled.
import prisma from '../config/db.js';
import {
  CEREMONY_COST_PROFILES,
  ULWALUKO_CLOSURE_RENAME,
  ULWALUKO_REGISTRATION_ITEMS,
  IBHOMA_TOOL_ITEMS,
  UBUKRWALA_ITEMS,
  UMGIDI_DEFAULT_ITEMS,
  UMGIDI_COST_PROFILE,
} from '../controllers/ceremonyCostProfiles.js';

export const FIX_NAME = 'ulwaluko-umgidi-2026-11-19';
const TOOL_LABELS = new Set(IBHOMA_TOOL_ITEMS.map((i) => i.label));

function costRows(profile, ceremonyId, guestCount, skuIdByName, onlyLabels = null) {
  const rows = [];
  for (const [phase, items] of Object.entries(profile)) {
    for (const item of items) {
      if (onlyLabels && !onlyLabels.has(item.label)) continue;
      rows.push({
        ceremonyId,
        phase,
        label: item.label,
        category: item.category,
        unit: item.unit,
        unitCost: item.unitCost,
        quantity: item.perGuestUnitFraction ? Math.max(1, Math.ceil((guestCount || 150) * item.perGuestUnitFraction)) : item.quantity,
        isInputField: item.isInputField || false,
        inputType: item.inputType || 'number',
        suggestedAmount: item.suggestedAmount || null,
        skuId: item.skuName ? (skuIdByName[item.skuName] || null) : null,
      });
    }
  }
  return rows;
}

export async function updateUlwalukoPlans() {
  if (await prisma.dataFix.findUnique({ where: { name: FIX_NAME } })) return { ceremonies: 0, checklist: 0, costs: 0, skipped: true };
  const [from, to] = ULWALUKO_CLOSURE_RENAME;
  await prisma.ceremonyChecklistItem.updateMany({ where: { label: from }, data: { label: to } });
  await prisma.checklistItem.updateMany({ where: { label: from }, data: { label: to } });
  await prisma.ceremonyCostItem.updateMany({ where: { label: from }, data: { label: to } });

  const skuNames = [...new Set(Object.values(CEREMONY_COST_PROFILES.ULWALUKO).flat().filter((i) => i.skuName).map((i) => i.skuName))];
  const skus = skuNames.length ? await prisma.sku.findMany({ where: { name: { in: skuNames } }, select: { id: true, name: true } }) : [];
  const skuIdByName = Object.fromEntries(skus.map((s) => [s.name, s.id]));

  const ceremonies = await prisma.ceremony.findMany({
    where: { type: 'ULWALUKO' },
    select: { id: true, hostId: true, guestCount: true, checklistItems: { select: { label: true } }, costItems: { select: { label: true } } },
  });
  let checklist = 0;
  let costs = 0;
  for (const ceremony of ceremonies) {
    const hasOwnUmgidi = await prisma.ceremony.count({ where: { hostId: ceremony.hostId, type: { in: ['UMGIDI', 'IMIGIDI'] } } });
    const wanted = [...ULWALUKO_REGISTRATION_ITEMS, ...IBHOMA_TOOL_ITEMS, ...(hasOwnUmgidi ? [] : UMGIDI_DEFAULT_ITEMS), ...UBUKRWALA_ITEMS];
    const have = new Set(ceremony.checklistItems.map((i) => i.label));
    const missing = wanted.filter((i) => !have.has(i.label));
    if (missing.length) {
      checklist += (await prisma.ceremonyChecklistItem.createMany({
        data: missing.map((i) => ({ ceremonyId: ceremony.id, phase: i.phase, label: i.label, isCompleted: false })),
      })).count;
    }
    const haveCost = new Set(ceremony.costItems.map((i) => i.label));
    const newCosts = [
      ...costRows(CEREMONY_COST_PROFILES.ULWALUKO, ceremony.id, ceremony.guestCount, skuIdByName, TOOL_LABELS),
      ...(hasOwnUmgidi ? [] : costRows(UMGIDI_COST_PROFILE, ceremony.id, ceremony.guestCount, skuIdByName)),
    ].filter((row) => !haveCost.has(row.label));
    if (newCosts.length) costs += (await prisma.ceremonyCostItem.createMany({ data: newCosts })).count;
  }

  // Older plans that keep their checklist on the plan rather than a ceremony.
  const plans = await prisma.preparationPlan.findMany({
    where: { ceremonyType: 'ULWALUKO', ceremonyId: null },
    select: { id: true, checklistItems: { select: { label: true } } },
  });
  for (const plan of plans) {
    const have = new Set(plan.checklistItems.map((i) => i.label));
    const missing = [...ULWALUKO_REGISTRATION_ITEMS, ...IBHOMA_TOOL_ITEMS, ...UMGIDI_DEFAULT_ITEMS, ...UBUKRWALA_ITEMS].filter((i) => !have.has(i.label));
    if (missing.length) checklist += (await prisma.checklistItem.createMany({ data: missing.map((i) => ({ planId: plan.id, phase: i.phase, label: i.label })) })).count;
  }

  await prisma.dataFix.create({ data: { name: FIX_NAME } });
  if (checklist || costs) console.log(`Ulwaluko plans updated: ${ceremonies.length + plans.length} plan(s), ${checklist} checklist and ${costs} cost item(s) added.`);
  return { ceremonies: ceremonies.length + plans.length, checklist, costs, skipped: false };
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  updateUlwalukoPlans()
    .then((r) => console.log('Done.', r))
    .catch((err) => { console.error(err); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
}
