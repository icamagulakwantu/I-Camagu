import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import prisma from '../config/db.js';
import { FIX_NAME, alignCeremonyOrder } from './ceremony-order-nov-2026.js';
import { fixUlwalukoDietWording } from './ulwaluko-diet-wording-nov-2026.js';
import { KHAPHA_COURTESY, SEATING_ALL, SEATING_LABEL } from '../controllers/ceremonyCostProfiles.js';

const integrationDescribe = process.env.RUN_POSTGRES_INTEGRATION === 'true' ? describe : describe.skip;
const DAY = 86400000;

integrationDescribe('ceremony order and wording, 23 Nov 2026 (real database)', () => {
  let host; let ulwaluko; let past; let khapha; let intambo;
  const task = (ceremonyId, phase, label, extra = {}) => prisma.ceremonyChecklistItem.create({ data: { ceremonyId, phase, label, ...extra } });
  const cost = (ceremonyId, phase, label, extra = {}) => prisma.ceremonyCostItem.create({ data: { ceremonyId, phase, label, category: 'alcohol', unit: 'bottle', unitCost: 10, quantity: 1, ...extra } });

  beforeAll(async () => {
    await prisma.dataFix.deleteMany({ where: { name: FIX_NAME } });
    host = await prisma.user.create({ data: { email: `order-${Date.now()}@example.test`, firstName: 'Host', lastName: 'Test', passwordHash: 'x' } });
    const make = (type, eventDate) => prisma.ceremony.create({ data: { hostId: host.id, type, title: type, eventDate } });
    ulwaluko = await make('ULWALUKO', new Date(Date.now() + 20 * DAY));
    past = await make('ULWALUKO', new Date(Date.now() - 90 * DAY));
    khapha = await make('UKUKHAPHA', new Date(Date.now() + 30 * DAY));
    intambo = await make('INTAMBO_ENKULU', new Date(Date.now() + 30 * DAY));
    for (const c of [ulwaluko, past]) {
      await task(c.id, 'DIET_EARLY_STAGE', 'Days 1-7: food with no salt and little water, so the wound dries and heals');
      await task(c.id, 'HIERARCHY_ALLOCATION', 'Set up the 14-group hierarchy allocations (see Hierarchy tool)');
      await cost(c.id, 'HIERARCHY_ALLOCATION', 'Set up the 14-group hierarchy allocations (see Hierarchy tool)', { unitCost: 0, quantity: 14 });
      await task(c.id, 'CLOSURE', 'Kunxitiswa - new clothes and remaining alcohol for the next day');
    }
    await task(khapha.id, 'CLOSURE_RITUAL', 'Brew Umqombothi for the ceremony');
    await cost(khapha.id, 'CLOSURE_RITUAL', 'Brew Umqombothi (50L to 75L) for the ceremony');
    await cost(khapha.id, 'CLOSURE_RITUAL', 'Brandy and gin for elders and participants', { isPurchased: true });
    await task(intambo.id, 'CLOSURE', 'Brew Umqombothi for the binding ceremony', { isCompleted: true });
    await cost(intambo.id, 'CLOSURE', 'Brew Umqombothi (50L to 75L) for the binding ceremony');
    await task(intambo.id, 'EXECUTION_RITUAL', 'Perform Ukuxhela: ritual throat-slitting of the goat by the lineage head at dawn');
  });

  afterAll(async () => {
    await prisma.ceremony.deleteMany({ where: { hostId: host.id } });
    await prisma.user.delete({ where: { id: host.id } });
    await prisma.dataFix.deleteMany({ where: { name: FIX_NAME } });
    await prisma.$disconnect();
  });

  it('rewords, moves and adds, keeping ticks and what was bought, once', async () => {
    await fixUlwalukoDietWording();
    const r = await alignCeremonyOrder();
    expect(r.skipped).toBe(false);

    const labels = async (id) => (await prisma.ceremonyChecklistItem.findMany({ where: { ceremonyId: id } })).map((i) => i.label);
    for (const c of [ulwaluko, past]) {
      const l = await labels(c.id);
      expect(l.join('|')).not.toMatch(/wound|heal/i);
      expect(l).toContain('Days 1-7: food with no salt and little water, as the ikhankatha guides');
      expect(l).toContain(SEATING_LABEL);
      expect(l).toContain('Ukunxityiswa - new clothes and remaining alcohol for the next day');
      // The R0 hierarchy price line is gone: it was a step, not a purchase.
      expect(await prisma.ceremonyCostItem.count({ where: { ceremonyId: c.id, phase: 'HIERARCHY_ALLOCATION' } })).toBe(0);
    }
    // New steps only for the plan still to come.
    expect(await labels(ulwaluko.id)).toEqual(expect.arrayContaining([
      'Ukuyala: the men advise him first, then the women and the eldest aunt',
      'Izipho: gifts for the ikrwala from family and guests',
      'A goat at home when he goes in, if your family does this (ask the elders)',
    ]));
    expect(await labels(past.id)).not.toContain('Izipho: gifts for the ikrwala from family and guests');

    // Ukukhapha: no umqombothi; the bought brandy is kept, reworded.
    expect((await labels(khapha.id)).filter((l) => l.startsWith('Brew'))).toEqual([]);
    expect(await prisma.ceremonyCostItem.count({ where: { ceremonyId: khapha.id, label: { startsWith: 'Brew' } } })).toBe(0);
    expect(await prisma.ceremonyCostItem.findFirst({ where: { ceremonyId: khapha.id, label: KHAPHA_COURTESY } })).toMatchObject({ isPurchased: true });
    expect(await labels(khapha.id)).toContain(SEATING_ALL);

    // Intambo: brewing moves to before the day, its tick kept; one name for step and price.
    const brew = await prisma.ceremonyChecklistItem.findFirst({ where: { ceremonyId: intambo.id, label: 'Brew Umqombothi for the binding ceremony' } });
    expect(brew).toMatchObject({ phase: 'SUPPLIES_SACRED', isCompleted: true });
    expect(await prisma.ceremonyCostItem.findFirst({ where: { ceremonyId: intambo.id, label: 'Brew Umqombothi for the binding ceremony' } })).toMatchObject({ phase: 'SUPPLIES_SACRED' });
    expect(await labels(intambo.id)).toContain('Ukuxhela: the lineage head slaughters the goat at dawn');

    expect(await alignCeremonyOrder()).toMatchObject({ skipped: true });
  });
});
