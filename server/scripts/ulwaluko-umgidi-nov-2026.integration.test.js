import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import prisma from '../config/db.js';
import { updateUlwalukoPlans, FIX_NAME } from './ulwaluko-umgidi-nov-2026.js';

const integrationDescribe = process.env.RUN_POSTGRES_INTEGRATION === 'true' ? describe : describe.skip;

integrationDescribe('ulwaluko plans updated once (real database)', () => {
  let a; let b; let solo; let withUmgidi;
  beforeAll(async () => {
    await prisma.dataFix.deleteMany({ where: { name: FIX_NAME } });
    const mk = (n) => prisma.user.create({ data: { email: `${n}-${randomUUID()}@example.invalid`, firstName: n, lastName: 'T' } });
    a = await mk('a'); b = await mk('b');
    solo = await prisma.ceremony.create({ data: { hostId: a.id, type: 'ULWALUKO', title: 'Solo' } });
    await prisma.ceremonyChecklistItem.createMany({ data: [
      { ceremonyId: solo.id, phase: 'IBHOMA_CONSTRUCTION', label: 'Poles for structure', isCompleted: true },
      { ceremonyId: solo.id, phase: 'IBHOMA_CLOSURE', label: 'Courtesy: 1-2 bottles of brandy and beers for closure team' },
    ] });
    withUmgidi = await prisma.ceremony.create({ data: { hostId: b.id, type: 'ULWALUKO', title: 'Has umgidi' } });
    await prisma.ceremony.create({ data: { hostId: b.id, type: 'UMGIDI', title: 'Umgidi' } });
  });
  afterAll(async () => {
    const ids = [solo.id, withUmgidi.id];
    await prisma.ceremonyChecklistItem.deleteMany({ where: { ceremonyId: { in: ids } } });
    await prisma.ceremonyCostItem.deleteMany({ where: { ceremonyId: { in: ids } } });
    await prisma.ceremony.deleteMany({ where: { hostId: { in: [a.id, b.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [a.id, b.id] } } });
    await prisma.$disconnect();
  });

  it('adds the tools, registration, umgidi and ubukrwala, keeps ticks, renames the closure courtesy', async () => {
    await updateUlwalukoPlans();
    const items = await prisma.ceremonyChecklistItem.findMany({ where: { ceremonyId: solo.id } });
    const labels = items.map((i) => i.label);
    expect(labels).toContain('Ipeki and shovel: clear the bushes and grass and make a patch');
    expect(labels).toContain('Saw and hammer (with nails)');
    expect(labels).toContain('Written consent from his parent or guardian');
    expect(labels).toContain('Arrange elder men for zoku yala guidance');
    expect(items.some((i) => i.phase === 'UBUKRWALA')).toBe(true);
    expect(labels).toContain('Courtesy: the family pays the young men who burn the ibhoma with a bottle and beers');
    expect(labels).not.toContain('Courtesy: 1-2 bottles of brandy and beers for closure team');
    expect(items.find((i) => i.label === 'Poles for structure').isCompleted).toBe(true);
    expect(await prisma.ceremonyCostItem.count({ where: { ceremonyId: solo.id, phase: 'COOKING_EBUHLANTI' } })).toBeGreaterThan(0);
  });

  it('does not double umgidi for a host who plans it separately', async () => {
    const labels = (await prisma.ceremonyChecklistItem.findMany({ where: { ceremonyId: withUmgidi.id } })).map((i) => i.label);
    expect(labels).toContain('Saw and hammer (with nails)');
    expect(labels).not.toContain('Arrange elder men for zoku yala guidance');
  });

  it('runs once: a removed item does not come back', async () => {
    await prisma.ceremonyChecklistItem.deleteMany({ where: { ceremonyId: solo.id, label: 'Saw and hammer (with nails)' } });
    expect((await updateUlwalukoPlans()).skipped).toBe(true);
    expect(await prisma.ceremonyChecklistItem.count({ where: { ceremonyId: solo.id, label: 'Saw and hammer (with nails)' } })).toBe(0);
  });
});
