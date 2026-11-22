import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import prisma from '../config/db.js';
import { FIX_NAME, addIbhomaItems } from './ibhoma-items-nov-2026.js';
import { IBHOMA_EXTRA_ITEMS } from '../controllers/ceremonyCostProfiles.js';

const integrationDescribe = process.env.RUN_POSTGRES_INTEGRATION === 'true' ? describe : describe.skip;

integrationDescribe('ibhoma items (real database)', () => {
  let host; let upcoming; let paid; let past;
  beforeAll(async () => {
    await prisma.dataFix.deleteMany({ where: { name: FIX_NAME } });
    host = await prisma.user.create({ data: { email: `ibhoma-${Date.now()}@example.test`, firstName: 'Host', lastName: 'Test', passwordHash: 'x' } });
    const make = (title, eventDate) => prisma.ceremony.create({ data: { hostId: host.id, type: 'ULWALUKO', title, eventDate } });
    upcoming = await make('Upcoming', new Date(Date.now() + 30 * 864e5));
    paid = await make('Lamp already bought', new Date(Date.now() + 30 * 864e5));
    past = await make('Already went', new Date(Date.now() - 30 * 864e5));
    for (const c of [upcoming, paid, past]) {
      await prisma.ceremonyChecklistItem.create({ data: { ceremonyId: c.id, phase: 'DAILY_ESSENTIALS', label: 'Matches, lamp/candles', isCompleted: c.id === paid.id } });
      await prisma.ceremonyCostItem.create({ data: { ceremonyId: c.id, phase: 'DAILY_ESSENTIALS', label: 'Matches, lamp/candles', category: 'supplies', unit: 'kit', unitCost: 135, quantity: 1, isPurchased: c.id === paid.id } });
    }
  });
  afterAll(async () => {
    await prisma.ceremony.deleteMany({ where: { hostId: host.id } });
    await prisma.user.delete({ where: { id: host.id } });
    await prisma.dataFix.deleteMany({ where: { name: FIX_NAME } });
    await prisma.$disconnect();
  });

  it('adds the items to upcoming plans, splits the old lamp line only where untouched, once', async () => {
    const r = await addIbhomaItems();
    expect(r).toMatchObject({ skipped: false });
    expect(r.renamed).toBeGreaterThanOrEqual(1);
    const labels = async (id) => (await prisma.ceremonyChecklistItem.findMany({ where: { ceremonyId: id } })).map((i) => i.label);
    const up = await labels(upcoming.id);
    for (const i of IBHOMA_EXTRA_ITEMS) expect(up).toContain(i.label);
    expect(up).toContain('Matches and candles');
    expect(up).not.toContain('Matches, lamp/candles');
    const lamp = await prisma.ceremonyCostItem.findFirst({ where: { ceremonyId: upcoming.id, label: 'Paraffin lamp' } });
    expect(lamp.unitCost).toBe(44.99);
    // Ticked and paid: kept exactly as it was.
    expect(await labels(paid.id)).toContain('Matches, lamp/candles');
    expect(await prisma.ceremonyCostItem.count({ where: { ceremonyId: paid.id, label: 'Matches, lamp/candles', isPurchased: true } })).toBe(1);
    // Already on the mountain: not touched.
    expect(await labels(past.id)).toEqual(['Matches, lamp/candles']);
    expect(await addIbhomaItems()).toMatchObject({ skipped: true });
  });
});
