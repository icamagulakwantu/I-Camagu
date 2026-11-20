import crypto from 'crypto';
import prisma from '../config/db.js';
import { readMeta } from './templateController.js';
import { applyChanges, cleanItems, diffItems } from '../../shared/templateDiff.js';
import { createNotification } from '../services/notificationDbService.js';

// Template collaboration. Owner -> invite link -> a signed-in member asks to
// edit -> owner approves them as an editor -> the editor's changes are saved
// as a proposal (the template is untouched) -> the owner reviews the
// original beside the edited version and merges the changes they accept.
//
// Access is to one template's checklist and shopping list only. Nothing here
// reads or returns the owner's ceremonies, pledges, ukugida, stokvels or
// profile beyond a first name.

const MAX_NOTE = 500;
const MAX_MESSAGE = 300;
const firstName = (u) => (u?.firstName || 'A member').trim();
const fullName = (u) => `${u?.firstName || ''} ${u?.lastName || ''}`.trim() || 'A member';

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

async function loadTemplate(templateId) {
  const template = await prisma.preparationPlan.findUnique({ where: { id: templateId }, include: { checklistItems: { orderBy: { id: 'asc' } } } });
  return template?.isTemplate ? template : null;
}
const currentItems = (template) => template.checklistItems.map(itemFromRow).filter(Boolean);

// 'owner' | 'editor' | 'requested' | 'declined' | 'none'
async function roleOf(template, userId) {
  if (template.hostId === userId) return 'owner';
  const member = await prisma.templateMember.findUnique({ where: { templateId_userId: { templateId: template.id, userId } } });
  if (!member || member.status === 'REMOVED') return 'none';
  return { EDITOR: 'editor', REQUESTED: 'requested', DECLINED: 'declined' }[member.status] || 'none';
}

const fail = (res, status, error) => res.status(status).json({ error });
const handle = (name, fn) => async (req, res) => {
  try { await fn(req, res); } catch (error) {
    console.error(`${name} error:`, error.message);
    fail(res, 500, 'Something went wrong. Please try again.');
  }
};

function counts(items) {
  return { taskCount: items.filter((i) => i.kind === 'task').length, shoppingCount: items.filter((i) => i.kind === 'cost').length };
}

// POST /templates/:id/invite: the owner's link (reused until revoked).
export const createInvite = handle('Template invite', async (req, res) => {
  const template = await loadTemplate(req.params.id);
  if (!template || template.hostId !== req.userId) return fail(res, 403, 'Not your template');
  let invite = await prisma.templateInvite.findFirst({ where: { templateId: template.id, revokedAt: null } });
  if (!invite) invite = await prisma.templateInvite.create({ data: { token: crypto.randomBytes(18).toString('base64url'), templateId: template.id, ownerId: req.userId } });
  res.json({ token: invite.token, path: `/t/${invite.token}` });
});

// DELETE /templates/:id/invite: stops the link working; editors keep access.
export const revokeInvite = handle('Template invite revoke', async (req, res) => {
  const template = await loadTemplate(req.params.id);
  if (!template || template.hostId !== req.userId) return fail(res, 403, 'Not your template');
  await prisma.templateInvite.updateMany({ where: { templateId: template.id, revokedAt: null }, data: { revokedAt: new Date() } });
  res.json({ ok: true });
});

async function templateForToken(token) {
  if (typeof token !== 'string' || token.length > 64) return null;
  const invite = await prisma.templateInvite.findUnique({ where: { token } });
  if (!invite || invite.revokedAt) return null;
  return loadTemplate(invite.templateId);
}

// GET /templates/invite/:token: what the link shows a signed-in member.
export const viewInvite = handle('Template invite view', async (req, res) => {
  const template = await templateForToken(req.params.token);
  if (!template) return fail(res, 404, 'This link has expired or was switched off. Ask for a new one.');
  const owner = await prisma.user.findUnique({ where: { id: template.hostId }, select: { firstName: true } });
  const items = currentItems(template);
  res.json({
    template: { id: template.id, title: template.title, ceremonyType: template.ceremonyType, ...counts(items), items },
    ownerName: firstName(owner),
    role: await roleOf(template, req.userId),
  });
});

// POST /templates/invite/:token/request: ask the owner for permission to edit.
export const requestAccess = handle('Template access request', async (req, res) => {
  const template = await templateForToken(req.params.token);
  if (!template) return fail(res, 404, 'This link has expired or was switched off. Ask for a new one.');
  if (template.hostId === req.userId) return res.json({ role: 'owner' });
  const message = String(req.body?.message || '').trim().slice(0, MAX_MESSAGE) || null;
  const existing = await prisma.templateMember.findUnique({ where: { templateId_userId: { templateId: template.id, userId: req.userId } } });
  if (existing?.status === 'EDITOR') return res.json({ role: 'editor' });
  if (existing?.status === 'DECLINED') return fail(res, 403, 'The owner declined this request.');
  await prisma.templateMember.upsert({
    where: { templateId_userId: { templateId: template.id, userId: req.userId } },
    update: { status: 'REQUESTED', message, decidedAt: null },
    create: { templateId: template.id, userId: req.userId, message },
  });
  const me = await prisma.user.findUnique({ where: { id: req.userId }, select: { firstName: true, lastName: true } });
  await createNotification(template.hostId, 'TEMPLATE_EDIT_REQUEST', `${fullName(me)} asks to help edit your template "${template.title}"`, 'templates').catch(() => {});
  res.status(201).json({ role: 'requested' });
});

// GET /templates/:id/people: requests and editors (owner only).
export const listPeople = handle('Template people', async (req, res) => {
  const template = await loadTemplate(req.params.id);
  if (!template || template.hostId !== req.userId) return fail(res, 403, 'Not your template');
  const members = await prisma.templateMember.findMany({ where: { templateId: template.id, status: { in: ['REQUESTED', 'EDITOR'] } }, orderBy: { createdAt: 'asc' } });
  const users = await prisma.user.findMany({ where: { id: { in: members.map((m) => m.userId) } }, select: { id: true, firstName: true, lastName: true, profileImage: true } });
  const byId = new Map(users.map((u) => [u.id, u]));
  res.json(members.map((m) => ({ id: m.id, status: m.status, message: m.message, createdAt: m.createdAt, name: fullName(byId.get(m.userId)), profileImage: byId.get(m.userId)?.profileImage || null })));
});

// POST /templates/:id/people/:memberId { approve }: owner decides.
export const decideRequest = handle('Template request decision', async (req, res) => {
  const template = await loadTemplate(req.params.id);
  if (!template || template.hostId !== req.userId) return fail(res, 403, 'Not your template');
  const member = await prisma.templateMember.findUnique({ where: { id: req.params.memberId } });
  if (!member || member.templateId !== template.id) return fail(res, 404, 'Request not found');
  const approve = req.body?.approve === true;
  await prisma.templateMember.update({ where: { id: member.id }, data: { status: approve ? 'EDITOR' : 'DECLINED', decidedAt: new Date() } });
  await createNotification(member.userId, approve ? 'TEMPLATE_EDIT_APPROVED' : 'TEMPLATE_EDIT_DECLINED',
    approve ? `You can now suggest edits to "${template.title}"` : `Your request to edit "${template.title}" was declined`, 'templates').catch(() => {});
  res.json({ status: approve ? 'EDITOR' : 'DECLINED' });
});

// DELETE /templates/:id/people/:memberId: owner removes an editor.
export const removePerson = handle('Template remove editor', async (req, res) => {
  const template = await loadTemplate(req.params.id);
  if (!template || template.hostId !== req.userId) return fail(res, 403, 'Not your template');
  const member = await prisma.templateMember.findUnique({ where: { id: req.params.memberId } });
  if (!member || member.templateId !== template.id) return fail(res, 404, 'Editor not found');
  await prisma.$transaction([
    prisma.templateMember.update({ where: { id: member.id }, data: { status: 'REMOVED', decidedAt: new Date() } }),
    prisma.templateProposal.updateMany({ where: { templateId: template.id, authorId: member.userId, status: 'OPEN' }, data: { status: 'WITHDRAWN', decidedAt: new Date() } }),
  ]);
  res.json({ ok: true });
});

// GET /templates/shared: templates I can suggest edits to.
export const listShared = handle('Templates shared with me', async (req, res) => {
  const members = await prisma.templateMember.findMany({ where: { userId: req.userId, status: { in: ['EDITOR', 'REQUESTED'] } } });
  const templates = await prisma.preparationPlan.findMany({ where: { id: { in: members.map((m) => m.templateId) }, isTemplate: true }, include: { checklistItems: true } });
  const owners = await prisma.user.findMany({ where: { id: { in: templates.map((t) => t.hostId) } }, select: { id: true, firstName: true } });
  const ownerName = new Map(owners.map((o) => [o.id, firstName(o)]));
  const open = await prisma.templateProposal.findMany({ where: { authorId: req.userId, templateId: { in: templates.map((t) => t.id) } }, orderBy: { updatedAt: 'desc' } });
  res.json(templates.map((t) => {
    const member = members.find((m) => m.templateId === t.id);
    const latest = open.find((p) => p.templateId === t.id);
    return { id: t.id, title: t.title, ceremonyType: t.ceremonyType, ownerName: ownerName.get(t.hostId), role: member.status === 'EDITOR' ? 'editor' : 'requested', ...counts(t.checklistItems.map(itemFromRow).filter(Boolean)), myProposalStatus: latest?.status || null };
  }));
});

// GET /templates/:id/workspace: the template as it is, plus proposals.
export const getWorkspace = handle('Template workspace', async (req, res) => {
  const template = await loadTemplate(req.params.id);
  if (!template) return fail(res, 404, 'Template not found');
  const role = await roleOf(template, req.userId);
  if (role !== 'owner' && role !== 'editor') return fail(res, 403, 'You do not have permission to edit this template');
  const items = currentItems(template);
  const out = { role, template: { id: template.id, title: template.title, ceremonyType: template.ceremonyType, ...counts(items) }, items };
  if (role === 'editor') {
    const mine = await prisma.templateProposal.findFirst({ where: { templateId: template.id, authorId: req.userId, status: 'OPEN' } });
    out.myProposal = mine ? { id: mine.id, note: mine.note, items: mine.items, changeCount: diffItems(mine.baseItems, mine.items).length, updatedAt: mine.updatedAt } : null;
  } else {
    const proposals = await prisma.templateProposal.findMany({ where: { templateId: template.id, status: 'OPEN' }, orderBy: { updatedAt: 'desc' } });
    const authors = await prisma.user.findMany({ where: { id: { in: proposals.map((p) => p.authorId) } }, select: { id: true, firstName: true, lastName: true } });
    const name = new Map(authors.map((a) => [a.id, fullName(a)]));
    out.proposals = proposals.map((p) => ({ id: p.id, authorName: name.get(p.authorId), note: p.note, changeCount: diffItems(p.baseItems, p.items).length, updatedAt: p.updatedAt }));
    out.pendingRequests = await prisma.templateMember.count({ where: { templateId: template.id, status: 'REQUESTED' } });
  }
  res.json(out);
});

// PUT /templates/:id/proposal { items, note }: an editor saves their edited
// version. The template itself does not change.
export const saveProposal = handle('Template proposal save', async (req, res) => {
  const template = await loadTemplate(req.params.id);
  if (!template) return fail(res, 404, 'Template not found');
  if ((await roleOf(template, req.userId)) !== 'editor') return fail(res, 403, 'Only approved editors can suggest changes');
  const items = cleanItems(req.body?.items);
  const note = String(req.body?.note || '').trim().slice(0, MAX_NOTE) || null;
  const existing = await prisma.templateProposal.findFirst({ where: { templateId: template.id, authorId: req.userId, status: 'OPEN' } });
  const base = existing ? existing.baseItems : currentItems(template);
  const changeCount = diffItems(base, items).length;
  const proposal = existing
    ? await prisma.templateProposal.update({ where: { id: existing.id }, data: { items, note } })
    : await prisma.templateProposal.create({ data: { templateId: template.id, authorId: req.userId, baseItems: base, items, note } });
  if (!existing && changeCount > 0) {
    const me = await prisma.user.findUnique({ where: { id: req.userId }, select: { firstName: true, lastName: true } });
    await createNotification(template.hostId, 'TEMPLATE_PROPOSAL', `${fullName(me)} suggested changes to "${template.title}"`, 'templates').catch(() => {});
  }
  res.json({ id: proposal.id, changeCount });
});

// DELETE /templates/:id/proposal: the editor withdraws their open proposal.
export const withdrawProposal = handle('Template proposal withdraw', async (req, res) => {
  await prisma.templateProposal.updateMany({ where: { templateId: req.params.id, authorId: req.userId, status: 'OPEN' }, data: { status: 'WITHDRAWN', decidedAt: new Date() } });
  res.json({ ok: true });
});

async function ownedProposal(req, res) {
  const template = await loadTemplate(req.params.id);
  if (!template || template.hostId !== req.userId) { fail(res, 403, 'Not your template'); return null; }
  const proposal = await prisma.templateProposal.findUnique({ where: { id: req.params.proposalId } });
  if (!proposal || proposal.templateId !== template.id) { fail(res, 404, 'Proposal not found'); return null; }
  return { template, proposal };
}

// GET /templates/:id/proposals/:proposalId: the original beside the edited
// version, change by change.
export const getProposal = handle('Template proposal view', async (req, res) => {
  const found = await ownedProposal(req, res);
  if (!found) return;
  const { template, proposal } = found;
  const author = await prisma.user.findUnique({ where: { id: proposal.authorId }, select: { firstName: true, lastName: true } });
  res.json({
    id: proposal.id, status: proposal.status, note: proposal.note, authorName: fullName(author), updatedAt: proposal.updatedAt,
    original: currentItems(template), edited: cleanItems(proposal.items), changes: diffItems(proposal.baseItems, proposal.items),
  });
});

// POST /templates/:id/proposals/:proposalId/merge { accept: [changeId] }
export const mergeProposal = handle('Template proposal merge', async (req, res) => {
  const found = await ownedProposal(req, res);
  if (!found) return;
  const { template, proposal } = found;
  if (proposal.status !== 'OPEN') return fail(res, 409, 'This proposal was already decided');
  const changes = diffItems(proposal.baseItems, proposal.items);
  const accept = Array.isArray(req.body?.accept) ? req.body.accept.map(String) : [];
  const { items, applied, skipped } = applyChanges(currentItems(template), changes, accept);

  const rowsById = new Map(template.checklistItems.map((r) => [r.id, r]));
  const keep = new Set(items.map((i) => i.key));
  await prisma.$transaction(async (tx) => {
    const remove = template.checklistItems.filter((r) => !keep.has(r.id)).map((r) => r.id);
    if (remove.length) await tx.checklistItem.deleteMany({ where: { id: { in: remove }, planId: template.id } });
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
        await tx.checklistItem.create({ data: { planId: template.id, ...data } });
      }
    }
    await tx.templateProposal.update({ where: { id: proposal.id }, data: { status: 'MERGED', mergedCount: applied.length, decidedAt: new Date() } });
  });
  await createNotification(proposal.authorId, 'TEMPLATE_PROPOSAL_MERGED', `${applied.length} of your changes to "${template.title}" were accepted`, 'templates').catch(() => {});
  res.json({ applied: applied.length, skipped });
});

// POST /templates/:id/proposals/:proposalId/decline
export const declineProposal = handle('Template proposal decline', async (req, res) => {
  const found = await ownedProposal(req, res);
  if (!found) return;
  const { template, proposal } = found;
  if (proposal.status !== 'OPEN') return fail(res, 409, 'This proposal was already decided');
  await prisma.templateProposal.update({ where: { id: proposal.id }, data: { status: 'DECLINED', decidedAt: new Date() } });
  await createNotification(proposal.authorId, 'TEMPLATE_PROPOSAL_DECLINED', `Your changes to "${template.title}" were not taken this time`, 'templates').catch(() => {});
  res.json({ ok: true });
});
