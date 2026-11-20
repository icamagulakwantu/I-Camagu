import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import prisma from '../config/db.js';
import * as collab from './templateCollabController.js';

const integrationDescribe = process.env.RUN_POSTGRES_INTEGRATION === 'true' ? describe : describe.skip;

function call(handler, req) {
  return new Promise((resolve) => {
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(body) { resolve({ status: this.statusCode, body }); },
    };
    handler({ params: {}, body: {}, ...req }, res);
  });
}

integrationDescribe('template collaboration (real database)', () => {
  let owner; let editor; let stranger; let template; let token;
  const rowLabel = async () => (await prisma.checklistItem.findMany({ where: { planId: template.id } })).map((r) => r.label).sort();

  beforeAll(async () => {
    const mk = (name) => prisma.user.create({ data: { email: `${name}-${randomUUID()}@example.invalid`, firstName: name, lastName: 'Test' } });
    owner = await mk('owner'); editor = await mk('editor'); stranger = await mk('stranger');
    template = await prisma.preparationPlan.create({ data: { hostId: owner.id, ceremonyType: 'ULWALUKO', title: 'Ulwaluko template', isTemplate: true } });
    await prisma.checklistItem.createMany({ data: [
      { planId: template.id, phase: 'PLANNING', label: 'Call the ingcibi', notes: JSON.stringify({ templateKind: 'task' }) },
      { planId: template.id, phase: 'FOOD', label: 'Sheep', notes: JSON.stringify({ templateKind: 'cost', category: 'livestock', unit: 'sheep', unitCost: 2700, quantity: 2, skuId: 'sku-1' }) },
      { planId: template.id, phase: 'PLANNING', label: 'Book the tent', notes: JSON.stringify({ templateKind: 'task' }) },
    ] });
  });

  afterAll(async () => {
    const ids = [owner.id, editor.id, stranger.id];
    await prisma.templateProposal.deleteMany({ where: { templateId: template.id } });
    await prisma.templateMember.deleteMany({ where: { templateId: template.id } });
    await prisma.templateInvite.deleteMany({ where: { templateId: template.id } });
    await prisma.checklistItem.deleteMany({ where: { planId: template.id } });
    await prisma.preparationPlan.deleteMany({ where: { id: template.id } });
    await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });

  it('only the owner can make an invite link', async () => {
    expect((await call(collab.createInvite, { userId: stranger.id, params: { id: template.id } })).status).toBe(403);
    const r = await call(collab.createInvite, { userId: owner.id, params: { id: template.id } });
    token = r.body.token;
    expect(r.body.path).toBe(`/t/${token}`);
    // Same link until revoked.
    expect((await call(collab.createInvite, { userId: owner.id, params: { id: template.id } })).body.token).toBe(token);
  });

  it('a member sees the template, asks to edit, and cannot edit until approved', async () => {
    const view = await call(collab.viewInvite, { userId: editor.id, params: { token } });
    expect(view.body).toMatchObject({ role: 'none', ownerName: 'owner', template: { title: 'Ulwaluko template', taskCount: 2, shoppingCount: 1 } });
    expect((await call(collab.requestAccess, { userId: editor.id, params: { token }, body: { message: 'Malume, let me add the ibhoma tools' } })).body.role).toBe('requested');
    expect(await prisma.notification.count({ where: { userId: owner.id, type: 'TEMPLATE_EDIT_REQUEST' } })).toBe(1);
    expect((await call(collab.saveProposal, { userId: editor.id, params: { id: template.id }, body: { items: [] } })).status).toBe(403);
    expect((await call(collab.getWorkspace, { userId: editor.id, params: { id: template.id } })).status).toBe(403);
  });

  it('the owner approves; the editor proposes; the template stays as it was', async () => {
    const people = await call(collab.listPeople, { userId: owner.id, params: { id: template.id } });
    expect(people.body).toHaveLength(1);
    expect(people.body[0]).toMatchObject({ status: 'REQUESTED', name: 'editor Test', message: 'Malume, let me add the ibhoma tools' });
    expect((await call(collab.decideRequest, { userId: stranger.id, params: { id: template.id, memberId: people.body[0].id }, body: { approve: true } })).status).toBe(403);
    await call(collab.decideRequest, { userId: owner.id, params: { id: template.id, memberId: people.body[0].id }, body: { approve: true } });

    const ws = await call(collab.getWorkspace, { userId: editor.id, params: { id: template.id } });
    expect(ws.body.role).toBe('editor');
    const items = ws.body.items.filter((i) => i.label !== 'Book the tent').map((i) => (i.label === 'Sheep' ? { ...i, quantity: 3 } : i));
    items.push({ key: 'new-1', kind: 'task', phase: 'IBHOMA_CONSTRUCTION', label: 'Ipeki and shovel' });
    const saved = await call(collab.saveProposal, { userId: editor.id, params: { id: template.id }, body: { items, note: 'Tools and a third sheep' } });
    expect(saved.body.changeCount).toBe(3);
    expect(await rowLabel()).toEqual(['Book the tent', 'Call the ingcibi', 'Sheep']);
  });

  it('the owner sees original and edited, merges only what they accept', async () => {
    const ws = await call(collab.getWorkspace, { userId: owner.id, params: { id: template.id } });
    expect(ws.body.proposals).toHaveLength(1);
    const pid = ws.body.proposals[0].id;
    const view = await call(collab.getProposal, { userId: owner.id, params: { id: template.id, proposalId: pid } });
    expect(view.body.original).toHaveLength(3);
    expect(view.body.edited).toHaveLength(3);
    expect(view.body.changes.map((c) => c.type).sort()).toEqual(['add', 'change', 'remove']);
    expect((await call(collab.getProposal, { userId: editor.id, params: { id: template.id, proposalId: pid } })).status).toBe(403);

    const accept = view.body.changes.filter((c) => c.type !== 'remove').map((c) => c.id);
    const merged = await call(collab.mergeProposal, { userId: owner.id, params: { id: template.id, proposalId: pid }, body: { accept } });
    expect(merged.body).toMatchObject({ applied: 2, skipped: [] });
    expect(await rowLabel()).toEqual(['Book the tent', 'Call the ingcibi', 'Ipeki and shovel', 'Sheep']);
    const sheep = await prisma.checklistItem.findFirst({ where: { planId: template.id, label: 'Sheep' } });
    expect(JSON.parse(sheep.notes)).toMatchObject({ quantity: 3, unitCost: 2700, skuId: 'sku-1', category: 'livestock' });
    expect((await call(collab.mergeProposal, { userId: owner.id, params: { id: template.id, proposalId: pid }, body: { accept } })).status).toBe(409);
    expect(await prisma.notification.count({ where: { userId: editor.id, type: 'TEMPLATE_PROPOSAL_MERGED' } })).toBe(1);
  });

  it('a revoked link stops working; a removed editor loses access', async () => {
    await call(collab.revokeInvite, { userId: owner.id, params: { id: template.id } });
    expect((await call(collab.viewInvite, { userId: stranger.id, params: { token } })).status).toBe(404);
    const people = await call(collab.listPeople, { userId: owner.id, params: { id: template.id } });
    await call(collab.removePerson, { userId: owner.id, params: { id: template.id, memberId: people.body[0].id } });
    expect((await call(collab.getWorkspace, { userId: editor.id, params: { id: template.id } })).status).toBe(403);
  });
});
