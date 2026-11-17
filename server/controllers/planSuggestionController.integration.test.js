import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import prisma from '../config/db.js';
import { createShareToken } from '../utils/shareToken.js';
import { addPublicSuggestion, listPublicSuggestions, listPlanSuggestions, acceptSuggestion, dismissSuggestion } from './planSuggestionController.js';

const integrationDescribe = process.env.RUN_POSTGRES_INTEGRATION === 'true' ? describe : describe.skip;

function call(handler, req) {
  return new Promise((resolve) => {
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(body) { resolve({ status: this.statusCode, body }); },
    };
    handler(req, res);
  });
}

integrationDescribe('family suggestions from a shared plan link (real database)', () => {
  let host; let stranger; let plan; let ceremony; let token;

  beforeAll(async () => {
    const mk = (name) => prisma.user.create({ data: { email: `${name}-${randomUUID()}@example.invalid`, firstName: name, lastName: 'Test' } });
    host = await mk('host');
    stranger = await mk('stranger');
    ceremony = await prisma.ceremony.create({ data: { hostId: host.id, type: 'ULWALUKO', title: 'Ulwaluko test' } });
    await prisma.ceremonyChecklistItem.create({ data: { ceremonyId: ceremony.id, phase: 'DIET_EARLY_STAGE', label: 'Green apples' } });
    token = createShareToken(Date.now(), randomUUID().replace(/-/g, ''));
    plan = await prisma.preparationPlan.create({ data: { hostId: host.id, ceremonyType: 'ULWALUKO', ceremonyId: ceremony.id, title: 'Ulwaluko test', shareToken: token } });
  });

  afterAll(async () => {
    await prisma.planSuggestion.deleteMany({ where: { planId: plan.id } });
    await prisma.preparationPlan.deleteMany({ where: { id: plan.id } });
    await prisma.ceremonyChecklistItem.deleteMany({ where: { ceremonyId: ceremony.id } });
    await prisma.ceremony.deleteMany({ where: { id: ceremony.id } });
    await prisma.notification.deleteMany({ where: { userId: { in: [host.id, stranger.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [host.id, stranger.id] } } });
    await prisma.$disconnect();
  });

  it('lets anyone with the link suggest, without an account, and shows labels only', async () => {
    const sent = await call(addPublicSuggestion, { params: { token }, body: { label: 'Imphepho', suggestedBy: 'Malume Sipho', phase: 'SPIRITUAL_ITEMS' } });
    expect(sent.status).toBe(201);
    const list = await call(listPublicSuggestions, { params: { token } });
    expect(list.body).toEqual([{ id: sent.body.id, label: 'Imphepho' }]);
  });

  it('refuses a bad link', async () => {
    const res = await call(addPublicSuggestion, { params: { token: 'nope' }, body: { label: 'Imphepho' } });
    expect(res.status).toBe(404);
  });

  it('only the host sees, accepts or dismisses suggestions', async () => {
    const [suggestion] = await prisma.planSuggestion.findMany({ where: { planId: plan.id } });
    expect((await call(listPlanSuggestions, { params: { planId: plan.id }, user: { id: stranger.id } })).status).toBe(403);
    expect((await call(acceptSuggestion, { params: { id: suggestion.id }, user: { id: stranger.id } })).status).toBe(403);
    expect((await call(dismissSuggestion, { params: { id: suggestion.id }, user: { id: stranger.id } })).status).toBe(403);
    const mine = await call(listPlanSuggestions, { params: { planId: plan.id }, user: { id: host.id } });
    expect(mine.body).toHaveLength(1);
    expect(mine.body[0]).toMatchObject({ label: 'Imphepho', suggestedBy: 'Malume Sipho' });
  });

  it('accepting adds it to the ceremony checklist the page shows, once', async () => {
    const [suggestion] = await prisma.planSuggestion.findMany({ where: { planId: plan.id } });
    const res = await call(acceptSuggestion, { params: { id: suggestion.id }, user: { id: host.id } });
    expect(res.status).toBe(200);
    const items = await prisma.ceremonyChecklistItem.findMany({ where: { ceremonyId: ceremony.id, label: 'Imphepho' } });
    expect(items).toHaveLength(1);
    expect(items[0].phase).toBe('SPIRITUAL_ITEMS');
    expect((await call(acceptSuggestion, { params: { id: suggestion.id }, user: { id: host.id } })).status).toBe(409);
  });

  it('dismissing removes it from the waiting list without touching the plan', async () => {
    const sent = await call(addPublicSuggestion, { params: { token }, body: { label: 'Extra matches' } });
    await call(dismissSuggestion, { params: { id: sent.body.id }, user: { id: host.id } });
    expect((await call(listPublicSuggestions, { params: { token } })).body).toEqual([]);
    expect(await prisma.ceremonyChecklistItem.count({ where: { ceremonyId: ceremony.id, label: 'Extra matches' } })).toBe(0);
  });
});
