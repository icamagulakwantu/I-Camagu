import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import prisma from '../config/db.js';
import { FIX_NAME, switchPapToSamp } from './samp-nov-2026.js';

const integrationDescribe = process.env.RUN_POSTGRES_INTEGRATION === 'true' ? describe : describe.skip;

integrationDescribe('white samp instead of pap (real database)', () => {
  let user; let ceremony;
  beforeAll(async () => {
    await prisma.dataFix.deleteMany({ where: { name: FIX_NAME } });
    user = await prisma.user.create({ data: { email: `samp-${randomUUID()}@example.invalid`, firstName: 'S', lastName: 'T' } });
    ceremony = await prisma.ceremony.create({ data: { hostId: user.id, type: 'UMGIDI', title: 'Samp test', guestCount: 250 } });
    await prisma.ceremonyCostItem.createMany({ data: [
      { ceremonyId: ceremony.id, phase: 'COOKING_KITCHEN', label: 'Maize meal for pap', category: 'food', unit: '50kg bag', unitCost: 520, quantity: 1 },
      { ceremonyId: ceremony.id, phase: 'COOKING_KITCHEN', label: 'Maize meal for pap', category: 'food', unit: '50kg bag', unitCost: 520, quantity: 1, isPurchased: true },
    ] });
    await prisma.ceremonyChecklistItem.createMany({ data: [
      { ceremonyId: ceremony.id, phase: 'COOKING_KITCHEN', label: 'Maize meal for pap' },
      { ceremonyId: ceremony.id, phase: 'COOKING_KITCHEN', label: 'Maize meal for pap', isCompleted: true },
    ] });
  });
  afterAll(async () => {
    await prisma.ceremonyCostItem.deleteMany({ where: { ceremonyId: ceremony.id } });
    await prisma.ceremonyChecklistItem.deleteMany({ where: { ceremonyId: ceremony.id } });
    await prisma.ceremony.delete({ where: { id: ceremony.id } });
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.$disconnect();
  });

  it('switches only unticked, unpaid lines, sized to the guests, once', async () => {
    expect(await switchPapToSamp()).toMatchObject({ skipped: false });
    const costs = await prisma.ceremonyCostItem.findMany({ where: { ceremonyId: ceremony.id }, orderBy: { isPurchased: 'asc' } });
    expect(costs[0]).toMatchObject({ label: 'White samp', unit: '10kg bag', unitCost: 185, quantity: 3 });
    expect(costs[1]).toMatchObject({ label: 'Maize meal for pap', isPurchased: true });
    const tasks = (await prisma.ceremonyChecklistItem.findMany({ where: { ceremonyId: ceremony.id } })).map((t) => `${t.label}:${t.isCompleted}`).sort();
    expect(tasks).toEqual(['Maize meal for pap:true', 'White samp:false']);
    expect(await switchPapToSamp()).toMatchObject({ skipped: true });
  });
});
