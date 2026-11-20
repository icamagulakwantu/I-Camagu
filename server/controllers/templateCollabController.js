import prisma from '../config/db.js';
import { readMeta } from './templateController.js';
import { cleanItems } from '../../shared/templateDiff.js';
import { makeCollab } from '../services/collab.js';

// Template collaboration (see services/collab.js for how it works).

// A template row as a plain item (see shared/templateDiff.js).
export function itemFromRow(row) {
  const meta = readMeta(row);
  const item = { key: row.id, kind: meta.templateKind === 'cost' ? 'cost' : 'task', phase: row.phase || 'GENERAL', label: row.label, isOptional: Boolean(meta.isOptional) };
  if (item.kind === 'cost') {
    item.quantity = meta.quantity === undefined || meta.quantity === null ? null : Number(meta.quantity);
    item.unit = meta.unit || 'item';
    item.unitCost = meta.unitCost === undefined || meta.unitCost === null ? null : Number(meta.unitCost);
  }
  return cleanItems([item])[0];
}

const asTarget = (plan) => (plan?.isTemplate ? { id: plan.id, ownerId: plan.hostId, title: plan.title, ceremonyType: plan.ceremonyType, raw: plan } : null);

const templateAdapter = {
  scope: 'TEMPLATE',
  noun: 'template',
  screen: 'templates',
  linkPrefix: '/t/',
  load: async (id) => asTarget(await prisma.preparationPlan.findUnique({ where: { id }, include: { checklistItems: { orderBy: { id: 'asc' } } } })),
  loadMany: async (ids) => (await prisma.preparationPlan.findMany({ where: { id: { in: ids }, isTemplate: true }, include: { checklistItems: true } })).map(asTarget),
  items: (target) => target.raw.checklistItems.map(itemFromRow).filter(Boolean),
  protectedKeys: () => new Set(),
  async apply(tx, target, items) {
    const rows = target.raw.checklistItems;
    const rowsById = new Map(rows.map((r) => [r.id, r]));
    const keep = new Set(items.map((i) => i.key));
    const remove = rows.filter((r) => !keep.has(r.id)).map((r) => r.id);
    if (remove.length) await tx.checklistItem.deleteMany({ where: { id: { in: remove }, planId: target.id } });
    for (const item of items) {
      const row = rowsById.get(item.key);
      const meta = row ? readMeta(row) : {};
      const nextMeta = item.kind === 'cost'
        ? { ...meta, templateKind: 'cost', category: meta.category || 'other', unit: item.unit, unitCost: item.unitCost ?? 0, quantity: item.quantity ?? 0, isOptional: item.isOptional }
        : { ...meta, templateKind: 'task', isOptional: item.isOptional };
      const data = { phase: item.phase, label: item.label, notes: JSON.stringify(nextMeta) };
      if (row) {
        if (row.phase !== data.phase || row.label !== data.label || row.notes !== data.notes) await tx.checklistItem.update({ where: { id: row.id }, data });
      } else {
        await tx.checklistItem.create({ data: { planId: target.id, ...data } });
      }
    }
  },
};

export const {
  createInvite, revokeInvite, viewInvite, requestAccess, listPeople, decideRequest, removePerson,
  listShared, getWorkspace, saveProposal, withdrawProposal, getProposal, mergeProposal, declineProposal,
} = makeCollab(templateAdapter);
