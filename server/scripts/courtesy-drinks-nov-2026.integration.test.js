import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import prisma from '../config/db.js';
import { FIX_NAME, fixCourtesyDrinks } from './courtesy-drinks-nov-2026.js';

const integrationDescribe = process.env.RUN_POSTGRES_INTEGRATION === 'true' ? describe : describe.skip;

integrationDescribe('courtesy drinks priced right (real database)', () => {
  let user; let ceremony;
  const line = (label, unitCost, quantity, extra = {}) => ({ ceremonyId: ceremony.id, phase: 'X', label, category: 'alcohol', unit: 'bottle', unitCost, quantity, ...extra });
  beforeAll(async () => {
    await prisma.dataFix.deleteMany({ where: { name: FIX_NAME } });
    user = await prisma.user.create({ data: { email: `courtesy-${randomUUID()}@example.invalid`, firstName: 'C', lastName: 'D' } });
    ceremony = await prisma.ceremony.create({ data: { hostId: user.id, type: 'UMGIDI', title: 'Courtesy test', guestCount: 150 } });
    await prisma.ceremonyCostItem.createMany({ data: [
      line('Courtesy gin, brandy and matches for the elder amagqirha', 355, 2),
      line('Provide brandy and gin for elders and participants', 355, 2),
      line('Courtesy: bottle and beers for the elders', 195, 1),
      line('Courtesy: bottle and beers for the elders', 195, 1, { isPurchased: true }),
      line('Provide brandy and gin for elders and participants', 400, 2),
    ] });
  });
  afterAll(async () => {
    await prisma.ceremonyCostItem.deleteMany({ where: { ceremonyId: ceremony.id } });
    await prisma.ceremony.delete({ where: { id: ceremony.id } });
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.$disconnect();
  });

  it('reprices unpaid lines at the old guide, counts a pair once, and leaves paid or own figures alone', async () => {
    expect(await fixCourtesyDrinks()).toMatchObject({ skipped: false });
    const rows = await prisma.ceremonyCostItem.findMany({ where: { ceremonyId: ceremony.id }, orderBy: [{ label: 'asc' }, { unitCost: 'asc' }] });
    const view = rows.map((r) => [r.label.slice(0, 20), r.unit, r.unitCost, r.quantity, r.isPurchased])
    expect(view).toEqual([
      ['Courtesy gin, brandy', 'set', 340, 1, false],
      ['Courtesy: bottle and', 'bottle', 180, 1, false],
      ['Courtesy: bottle and', 'bottle', 195, 1, true],
      ['Provide brandy and g', 'pair', 325, 2, false],
      ['Provide brandy and g', 'bottle', 400, 2, false],
    ]);
    expect(await fixCourtesyDrinks()).toMatchObject({ skipped: true });
  });
});
