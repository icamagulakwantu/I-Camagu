import crypto from 'crypto';
import prisma from '../config/db.js';
import { applyChanges, cleanItems, diffItems } from '../../shared/templateDiff.js';
import { createNotification } from './notificationDbService.js';

// Collaboration with approval, for anything with a checklist and shopping
// list: ceremony templates and live ceremony plans. The owner shares an
// invite link; a signed-in member asks to edit; the owner approves them as
// an editor; the editor's changes are saved as a proposal (the original is
// untouched) until the owner reviews the original beside the edited version
// and merges the changes they accept.
//
// An adapter says what is being shared:
//   scope, noun, screen, linkPrefix,
//   load(id)            -> { id, ownerId, title, ceremonyType, raw } | null
//   items(target)       -> plain items (shared/templateDiff.js)
//   protectedKeys(target) -> keys that must not be removed (ticked or paid)
//   apply(tx, target, items) -> write the merged items back
//   loadMany(ids)       -> targets, for "shared with me"
// Access is to that one checklist and shopping list only: nothing here reads
// or returns the owner's pledges, ukugida, money paid, stokvels or profile
// beyond a first name.

const MAX_NOTE = 500;
const MAX_MESSAGE = 300;
const firstName = (u) => (u?.firstName || 'A member').trim();
const fullName = (u) => `${u?.firstName || ''} ${u?.lastName || ''}`.trim() || 'A member';
const fail = (res, status, error) => res.status(status).json({ error });
const counts = (items) => ({ taskCount: items.filter((i) => i.kind === 'task').length, shoppingCount: items.filter((i) => i.kind === 'cost').length });
const EXPIRED = 'This link has expired or was switched off. Ask for a new one.';

export function makeCollab(adapter) {
  const { scope, noun, screen, linkPrefix } = adapter;
  const NOT_YOURS = `Not your ${noun}`;
  const handle = (name, fn) => async (req, res) => {
    try { await fn(req, res); } catch (error) {
      console.error(`${noun} ${name} error:`, error.message);
      fail(res, 500, 'Something went wrong. Please try again.');
    }
  };
  const memberKey = (targetId, userId) => ({ templateId_userId: { templateId: targetId, userId } });

  async function roleOf(target, userId) {
    if (target.ownerId === userId) return 'owner';
    const member = await prisma.templateMember.findUnique({ where: memberKey(target.id, userId) });
    if (!member || member.status === 'REMOVED' || member.scope !== scope) return 'none';
    return { EDITOR: 'editor', REQUESTED: 'requested', DECLINED: 'declined' }[member.status] || 'none';
  }
  async function owned(req, res) {
    const target = await adapter.load(req.params.id);
    if (!target || target.ownerId !== req.userId) { fail(res, 403, NOT_YOURS); return null; }
    return target;
  }
  async function targetForToken(token) {
    if (typeof token !== 'string' || token.length > 64) return null;
    const invite = await prisma.templateInvite.findUnique({ where: { token } });
    if (!invite || invite.revokedAt || invite.scope !== scope) return null;
    return adapter.load(invite.templateId);
  }
  const summary = (target, items) => ({ id: target.id, title: target.title, ceremonyType: target.ceremonyType, ...counts(items) });

  const createInvite = handle('invite', async (req, res) => {
    const target = await owned(req, res); if (!target) return;
    let invite = await prisma.templateInvite.findFirst({ where: { templateId: target.id, scope, revokedAt: null } });
    if (!invite) invite = await prisma.templateInvite.create({ data: { token: crypto.randomBytes(18).toString('base64url'), templateId: target.id, ownerId: req.userId, scope } });
    res.json({ token: invite.token, path: `${linkPrefix}${invite.token}` });
  });

  const revokeInvite = handle('invite revoke', async (req, res) => {
    const target = await owned(req, res); if (!target) return;
    await prisma.templateInvite.updateMany({ where: { templateId: target.id, scope, revokedAt: null }, data: { revokedAt: new Date() } });
    res.json({ ok: true });
  });

  const viewInvite = handle('invite view', async (req, res) => {
    const target = await targetForToken(req.params.token);
    if (!target) return fail(res, 404, EXPIRED);
    const owner = await prisma.user.findUnique({ where: { id: target.ownerId }, select: { firstName: true } });
    const items = adapter.items(target);
    res.json({ template: { ...summary(target, items), items }, ownerName: firstName(owner), role: await roleOf(target, req.userId) });
  });

  const requestAccess = handle('access request', async (req, res) => {
    const target = await targetForToken(req.params.token);
    if (!target) return fail(res, 404, EXPIRED);
    if (target.ownerId === req.userId) return res.json({ role: 'owner' });
    const message = String(req.body?.message || '').trim().slice(0, MAX_MESSAGE) || null;
    const existing = await prisma.templateMember.findUnique({ where: memberKey(target.id, req.userId) });
    if (existing?.status === 'EDITOR') return res.json({ role: 'editor' });
    if (existing?.status === 'DECLINED') return fail(res, 403, 'The owner declined this request.');
    await prisma.templateMember.upsert({
      where: memberKey(target.id, req.userId),
      update: { status: 'REQUESTED', message, decidedAt: null, scope },
      create: { templateId: target.id, userId: req.userId, message, scope },
    });
    const me = await prisma.user.findUnique({ where: { id: req.userId }, select: { firstName: true, lastName: true } });
    await createNotification(target.ownerId, 'TEMPLATE_EDIT_REQUEST', `${fullName(me)} asks to help edit your ${noun} "${target.title}"`, screen).catch(() => {});
    res.status(201).json({ role: 'requested' });
  });

  const listPeople = handle('people', async (req, res) => {
    const target = await owned(req, res); if (!target) return;
    const members = await prisma.templateMember.findMany({ where: { templateId: target.id, scope, status: { in: ['REQUESTED', 'EDITOR'] } }, orderBy: { createdAt: 'asc' } });
    const users = await prisma.user.findMany({ where: { id: { in: members.map((m) => m.userId) } }, select: { id: true, firstName: true, lastName: true, profileImage: true } });
    const byId = new Map(users.map((u) => [u.id, u]));
    res.json(members.map((m) => ({ id: m.id, status: m.status, message: m.message, createdAt: m.createdAt, name: fullName(byId.get(m.userId)), profileImage: byId.get(m.userId)?.profileImage || null })));
  });

  const decideRequest = handle('request decision', async (req, res) => {
    const target = await owned(req, res); if (!target) return;
    const member = await prisma.templateMember.findUnique({ where: { id: req.params.memberId } });
    if (!member || member.templateId !== target.id) return fail(res, 404, 'Request not found');
    const approve = req.body?.approve === true;
    await prisma.templateMember.update({ where: { id: member.id }, data: { status: approve ? 'EDITOR' : 'DECLINED', decidedAt: new Date() } });
    await createNotification(member.userId, approve ? 'TEMPLATE_EDIT_APPROVED' : 'TEMPLATE_EDIT_DECLINED',
      approve ? `You can now suggest edits to "${target.title}"` : `Your request to edit "${target.title}" was declined`, screen).catch(() => {});
    res.json({ status: approve ? 'EDITOR' : 'DECLINED' });
  });

  const removePerson = handle('remove editor', async (req, res) => {
    const target = await owned(req, res); if (!target) return;
    const member = await prisma.templateMember.findUnique({ where: { id: req.params.memberId } });
    if (!member || member.templateId !== target.id) return fail(res, 404, 'Editor not found');
    await prisma.$transaction([
      prisma.templateMember.update({ where: { id: member.id }, data: { status: 'REMOVED', decidedAt: new Date() } }),
      prisma.templateProposal.updateMany({ where: { templateId: target.id, authorId: member.userId, status: 'OPEN' }, data: { status: 'WITHDRAWN', decidedAt: new Date() } }),
    ]);
    res.json({ ok: true });
  });

  const listShared = handle('shared with me', async (req, res) => {
    const members = await prisma.templateMember.findMany({ where: { userId: req.userId, scope, status: { in: ['EDITOR', 'REQUESTED'] } } });
    const targets = await adapter.loadMany(members.map((m) => m.templateId));
    const owners = await prisma.user.findMany({ where: { id: { in: targets.map((t) => t.ownerId) } }, select: { id: true, firstName: true } });
    const ownerName = new Map(owners.map((o) => [o.id, firstName(o)]));
    const mine = await prisma.templateProposal.findMany({ where: { authorId: req.userId, templateId: { in: targets.map((t) => t.id) } }, orderBy: { updatedAt: 'desc' } });
    res.json(targets.map((t) => {
      const member = members.find((m) => m.templateId === t.id);
      const latest = mine.find((p) => p.templateId === t.id);
      return { ...summary(t, adapter.items(t)), ownerName: ownerName.get(t.ownerId), role: member.status === 'EDITOR' ? 'editor' : 'requested', myProposalStatus: latest?.status || null };
    }));
  });

  const getWorkspace = handle('workspace', async (req, res) => {
    const target = await adapter.load(req.params.id);
    if (!target) return fail(res, 404, `${noun[0].toUpperCase()}${noun.slice(1)} not found`);
    const role = await roleOf(target, req.userId);
    if (role !== 'owner' && role !== 'editor') return fail(res, 403, `You do not have permission to edit this ${noun}`);
    const items = adapter.items(target);
    const out = { role, template: summary(target, items), items };
    if (role === 'editor') {
      const mine = await prisma.templateProposal.findFirst({ where: { templateId: target.id, authorId: req.userId, status: 'OPEN' } });
      out.myProposal = mine ? { id: mine.id, note: mine.note, items: mine.items, changeCount: diffItems(mine.baseItems, mine.items).length, updatedAt: mine.updatedAt } : null;
    } else {
      const proposals = await prisma.templateProposal.findMany({ where: { templateId: target.id, status: 'OPEN' }, orderBy: { updatedAt: 'desc' } });
      const authors = await prisma.user.findMany({ where: { id: { in: proposals.map((p) => p.authorId) } }, select: { id: true, firstName: true, lastName: true } });
      const name = new Map(authors.map((a) => [a.id, fullName(a)]));
      out.proposals = proposals.map((p) => ({ id: p.id, authorName: name.get(p.authorId), note: p.note, changeCount: diffItems(p.baseItems, p.items).length, updatedAt: p.updatedAt }));
      out.pendingRequests = await prisma.templateMember.count({ where: { templateId: target.id, scope, status: 'REQUESTED' } });
    }
    res.json(out);
  });

  const saveProposal = handle('proposal save', async (req, res) => {
    const target = await adapter.load(req.params.id);
    if (!target) return fail(res, 404, `${noun} not found`);
    if ((await roleOf(target, req.userId)) !== 'editor') return fail(res, 403, 'Only approved editors can suggest changes');
    const items = cleanItems(req.body?.items);
    const note = String(req.body?.note || '').trim().slice(0, MAX_NOTE) || null;
    const existing = await prisma.templateProposal.findFirst({ where: { templateId: target.id, authorId: req.userId, status: 'OPEN' } });
    const base = existing ? existing.baseItems : adapter.items(target);
    const changeCount = diffItems(base, items).length;
    const proposal = existing
      ? await prisma.templateProposal.update({ where: { id: existing.id }, data: { items, note } })
      : await prisma.templateProposal.create({ data: { templateId: target.id, authorId: req.userId, baseItems: base, items, note } });
    if (!existing && changeCount > 0) {
      const me = await prisma.user.findUnique({ where: { id: req.userId }, select: { firstName: true, lastName: true } });
      await createNotification(target.ownerId, 'TEMPLATE_PROPOSAL', `${fullName(me)} suggested changes to "${target.title}"`, screen).catch(() => {});
    }
    res.json({ id: proposal.id, changeCount });
  });

  const withdrawProposal = handle('proposal withdraw', async (req, res) => {
    await prisma.templateProposal.updateMany({ where: { templateId: req.params.id, authorId: req.userId, status: 'OPEN' }, data: { status: 'WITHDRAWN', decidedAt: new Date() } });
    res.json({ ok: true });
  });

  async function ownedProposal(req, res) {
    const target = await owned(req, res); if (!target) return null;
    const proposal = await prisma.templateProposal.findUnique({ where: { id: req.params.proposalId } });
    if (!proposal || proposal.templateId !== target.id) { fail(res, 404, 'Proposal not found'); return null; }
    return { target, proposal };
  }

  const getProposal = handle('proposal view', async (req, res) => {
    const found = await ownedProposal(req, res); if (!found) return;
    const { target, proposal } = found;
    const author = await prisma.user.findUnique({ where: { id: proposal.authorId }, select: { firstName: true, lastName: true } });
    res.json({
      id: proposal.id, status: proposal.status, note: proposal.note, authorName: fullName(author), updatedAt: proposal.updatedAt,
      original: adapter.items(target), edited: cleanItems(proposal.items), changes: diffItems(proposal.baseItems, proposal.items),
    });
  });

  const mergeProposal = handle('proposal merge', async (req, res) => {
    const found = await ownedProposal(req, res); if (!found) return;
    const { target, proposal } = found;
    if (proposal.status !== 'OPEN') return fail(res, 409, 'This proposal was already decided');
    const changes = diffItems(proposal.baseItems, proposal.items);
    // Never remove something already ticked or paid: the family's record stays.
    const locked = adapter.protectedKeys(target);
    const lockedSkips = changes.filter((c) => c.type === 'remove' && locked.has(c.key)).map((c) => ({ id: c.id, reason: 'Already ticked or paid' }));
    const accept = (Array.isArray(req.body?.accept) ? req.body.accept.map(String) : []).filter((id) => !lockedSkips.some((s) => s.id === id));
    const { items, applied, skipped } = applyChanges(adapter.items(target), changes, accept);
    await prisma.$transaction(async (tx) => {
      await adapter.apply(tx, target, items);
      await tx.templateProposal.update({ where: { id: proposal.id }, data: { status: 'MERGED', mergedCount: applied.length, decidedAt: new Date() } });
    });
    await createNotification(proposal.authorId, 'TEMPLATE_PROPOSAL_MERGED', `${applied.length} of your changes to "${target.title}" were accepted`, screen).catch(() => {});
    res.json({ applied: applied.length, skipped: [...skipped, ...lockedSkips.filter((s) => (req.body?.accept || []).includes(s.id))] });
  });

  const declineProposal = handle('proposal decline', async (req, res) => {
    const found = await ownedProposal(req, res); if (!found) return;
    const { target, proposal } = found;
    if (proposal.status !== 'OPEN') return fail(res, 409, 'This proposal was already decided');
    await prisma.templateProposal.update({ where: { id: proposal.id }, data: { status: 'DECLINED', decidedAt: new Date() } });
    await createNotification(proposal.authorId, 'TEMPLATE_PROPOSAL_DECLINED', `Your changes to "${target.title}" were not taken this time`, screen).catch(() => {});
    res.json({ ok: true });
  });

  return { createInvite, revokeInvite, viewInvite, requestAccess, listPeople, decideRequest, removePerson, listShared, getWorkspace, saveProposal, withdrawProposal, getProposal, mergeProposal, declineProposal };
}
