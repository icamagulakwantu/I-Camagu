import prisma from '../config/db.js';
import { cleanItems } from '../../shared/templateDiff.js';
import { UNFORESEEN_PHASE } from '../../shared/ceremonyCosts.js';
import { makeCollab } from '../services/collab.js';

// Live ceremony plans, edited together with approval (see services/collab.js).
// Editors suggest steps and shopping items: names, quantities, prices. They
// never see or touch ticks, what was paid, pledges, ukugida, the budget,
// guests, the date or who can see the plan. Something already ticked or
// paid can never be removed through a suggestion.

const taskItem = (row) => cleanItems([{ key: `t:${row.id}`, kind: 'task', phase: row.phase, label: row.label, isOptional: Boolean(row.isOptional) }])[0];
const costItem = (row) => cleanItems([{ key: `c:${row.id}`, kind: 'cost', phase: row.phase, label: row.label, quantity: row.quantity, unit: row.unit, unitCost: row.unitCost }])[0];
const INCLUDE = { checklistItems: { orderBy: { createdAt: 'asc' } }, costItems: { orderBy: { createdAt: 'asc' } } };
const asTarget = (c) => (c ? { id: c.id, ownerId: c.hostId, title: c.title, ceremonyType: c.type, raw: c } : null);

const ceremonyAdapter = {
  scope: 'CEREMONY',
  noun: 'plan',
  screen: 'ceremonyhub',
  linkPrefix: '/p/',
  load: async (id) => asTarget(await prisma.ceremony.findUnique({ where: { id }, include: INCLUDE })),
  loadMany: async (ids) => (await prisma.ceremony.findMany({ where: { id: { in: ids } }, include: INCLUDE })).map(asTarget),
  items: (target) => [
    ...target.raw.checklistItems.filter((r) => r.phase !== UNFORESEEN_PHASE).map(taskItem),
    ...target.raw.costItems.map(costItem),
  ].filter(Boolean),
  protectedKeys: (target) => new Set([
    ...target.raw.checklistItems.filter((r) => r.isCompleted || r.actualCostZAR != null).map((r) => `t:${r.id}`),
    ...target.raw.costItems.filter((r) => r.isPurchased).map((r) => `c:${r.id}`),
  ]),
  async apply(tx, target, items) {
    const { checklistItems, costItems } = target.raw;
    const keep = new Set(items.map((i) => i.key));
    const locked = ceremonyAdapter.protectedKeys(target);
    // Removed: only rows that were in the editable list, and never ticked or paid ones.
    const removeTasks = checklistItems.filter((r) => r.phase !== UNFORESEEN_PHASE && !keep.has(`t:${r.id}`) && !locked.has(`t:${r.id}`)).map((r) => r.id);
    const removeCosts = costItems.filter((r) => !keep.has(`c:${r.id}`) && !locked.has(`c:${r.id}`)).map((r) => r.id);
    if (removeTasks.length) await tx.ceremonyChecklistItem.deleteMany({ where: { id: { in: removeTasks }, ceremonyId: target.id } });
    if (removeCosts.length) await tx.ceremonyCostItem.deleteMany({ where: { id: { in: removeCosts }, ceremonyId: target.id } });
    const taskById = new Map(checklistItems.map((r) => [`t:${r.id}`, r]));
    const costById = new Map(costItems.map((r) => [`c:${r.id}`, r]));
    for (const item of items) {
      if (item.kind === 'task') {
        const row = taskById.get(item.key);
        const data = { phase: item.phase, label: item.label, isOptional: item.isOptional };
        if (!row) await tx.ceremonyChecklistItem.create({ data: { ceremonyId: target.id, ...data, isCompleted: false } });
        else if (row.phase !== data.phase || row.label !== data.label || Boolean(row.isOptional) !== data.isOptional) await tx.ceremonyChecklistItem.update({ where: { id: row.id }, data });
      } else {
        const row = costById.get(item.key);
        const data = { phase: item.phase, label: item.label, unit: item.unit || 'item', unitCost: item.unitCost ?? 0, quantity: item.quantity ?? 1 };
        if (!row) await tx.ceremonyCostItem.create({ data: { ceremonyId: target.id, category: 'other', ...data } });
        else if (row.phase !== data.phase || row.label !== data.label || row.unit !== data.unit || row.unitCost !== data.unitCost || row.quantity !== data.quantity) {
          await tx.ceremonyCostItem.update({ where: { id: row.id }, data });
        }
      }
    }
  },
};

export const collab = makeCollab(ceremonyAdapter);
