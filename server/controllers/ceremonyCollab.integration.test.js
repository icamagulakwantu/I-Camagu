import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import prisma from '../config/db.js';
import { collab } from './ceremonyCollabController.js';
import * as templateCollab from './templateCollabController.js';

const integrationDescribe = process.env.RUN_POSTGRES_INTEGRATION === 'true' ? describe : describe.skip;
function call(handler, req) {
  return new Promise((resolve) => {
    const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { resolve({ status: this.statusCode, body }); } };
    handler({ params: {}, body: {}, ...req }, res);
  });
}

integrationDescribe('live ceremony plans edited with approval (real database)', () => {
  let owner; let helper; let ceremony; let token; let pid;
  beforeAll(async () => {
    const mk = (n) => prisma.user.create({ data: { email: `${n}-${randomUUID()}@example.invalid`, firstName: n, lastName: 'Test' } });
    owner = await mk('owner'); helper = await mk('helper');
    ceremony = await prisma.ceremony.create({ data: { hostId: owner.id, type: 'UMGIDI', title: 'Umgidi kaSoso', budgetZAR: 40000 } });
    await prisma.ceremonyChecklistItem.createMany({ data: [
      { ceremonyId: ceremony.id, phase: 'PLANNING', label: 'Book the tent' },
      { ceremonyId: ceremony.id, phase: 'PLANNING', label: 'Call the elders', isCompleted: true },
    ] });
    await prisma.ceremonyCostItem.createMany({ data: [
      { ceremonyId: ceremony.id, phase: 'FOOD', label: 'Sheep', category: 'livestock', unit: 'sheep', unitCost: 2700, quantity: 2 },
      { ceremonyId: ceremony.id, phase: 'FOOD', label: 'White samp', category: 'food', unit: '10kg bag', unitCost: 185, quantity: 2, isPurchased: true },
    ] });
  });
  afterAll(async () => {
    await prisma.templateProposal.deleteMany({ where: { templateId: ceremony.id } });
    await prisma.templateMember.deleteMany({ where: { templateId: ceremony.id } });
    await prisma.templateInvite.deleteMany({ where: { templateId: ceremony.id } });
    await prisma.ceremony.delete({ where: { id: ceremony.id } });
    await prisma.notification.deleteMany({ where: { userId: { in: [owner.id, helper.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [owner.id, helper.id] } } });
    await prisma.$disconnect();
  });

  it('invite, ask, approve: and a plan link is not a template link', async () => {
    const r = await call(collab.createInvite, { userId: owner.id, params: { id: ceremony.id } });
    token = r.body.token;
    expect(r.body.path).toBe(`/p/${token}`);
    expect((await call(templateCollab.viewInvite, { userId: helper.id, params: { token } })).status).toBe(404);
    const view = await call(collab.viewInvite, { userId: helper.id, params: { token } });
    expect(view.body.template).toMatchObject({ title: 'Umgidi kaSoso', taskCount: 2, shoppingCount: 2 });
    expect(JSON.stringify(view.body)).not.toMatch(/40000|budget|isCompleted|isPurchased/);
    await call(collab.requestAccess, { userId: helper.id, params: { token } });
    const people = await call(collab.listPeople, { userId: owner.id, params: { id: ceremony.id } });
    await call(collab.decideRequest, { userId: owner.id, params: { id: ceremony.id, memberId: people.body[0].id }, body: { approve: true } });
  });

  it('the helper proposes; nothing changes until the owner merges; ticked or paid is never removed', async () => {
    const ws = await call(collab.getWorkspace, { userId: helper.id, params: { id: ceremony.id } });
    expect(ws.body.role).toBe('editor');
    const items = ws.body.items
      .filter((i) => !['Book the tent', 'Call the elders', 'White samp'].includes(i.label))
      .map((i) => (i.label === 'Sheep' ? { ...i, quantity: 3 } : i));
    items.push({ key: 'new-1', kind: 'cost', phase: 'FOOD', label: 'Cabbage', quantity: 9, unit: 'head', unitCost: 22 });
    const saved = await call(collab.saveProposal, { userId: helper.id, params: { id: ceremony.id }, body: { items, note: 'More sheep, add cabbage' } });
    expect(saved.body.changeCount).toBe(5);
    expect(await prisma.ceremonyCostItem.count({ where: { ceremonyId: ceremony.id } })).toBe(2);
    const owners = await call(collab.getWorkspace, { userId: owner.id, params: { id: ceremony.id } });
    pid = owners.body.proposals[0].id;
    const view = await call(collab.getProposal, { userId: owner.id, params: { id: ceremony.id, proposalId: pid } });
    const merged = await call(collab.mergeProposal, { userId: owner.id, params: { id: ceremony.id, proposalId: pid }, body: { accept: view.body.changes.map((c) => c.id) } });
    expect(merged.body.applied).toBe(3);
    expect(merged.body.skipped.map((s) => s.reason)).toEqual(['Already ticked or paid', 'Already ticked or paid']);
    const tasks = (await prisma.ceremonyChecklistItem.findMany({ where: { ceremonyId: ceremony.id } })).map((t) => t.label);
    expect(tasks).toEqual(['Call the elders']);
    const costs = await prisma.ceremonyCostItem.findMany({ where: { ceremonyId: ceremony.id }, orderBy: { label: 'asc' } });
    expect(costs.map((c) => `${c.label}:${c.quantity}:${c.isPurchased}`)).toEqual(['Cabbage:9:false', 'Sheep:3:false', 'White samp:2:true']);
    expect(Number((await prisma.ceremony.findUnique({ where: { id: ceremony.id } })).budgetZAR)).toBe(40000);
  });
});
