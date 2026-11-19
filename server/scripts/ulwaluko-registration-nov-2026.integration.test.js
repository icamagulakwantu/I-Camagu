import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import prisma from '../config/db.js';
import { FIX_NAME, addUlwalukoRegistrationSteps } from './ulwaluko-registration-nov-2026.js';

const integrationDescribe = process.env.RUN_POSTGRES_INTEGRATION === 'true' ? describe : describe.skip;

integrationDescribe('ulwaluko registration steps (real database)', () => {
  let user, upcoming, started;
  const now = new Date('2026-11-20T00:00:00Z');
  beforeAll(async () => {
    await prisma.dataFix.deleteMany({ where: { name: FIX_NAME } });
    user = await prisma.user.create({ data: { email: `reg-${Date.now()}@example.invalid`, firstName: 'T', lastName: 'T', passwordHash: 'x' } });
    upcoming = await prisma.ceremony.create({ data: { title: 'Upcoming', type: 'ULWALUKO', hostId: user.id, eventDate: new Date('2027-06-20') } });
    started = await prisma.ceremony.create({ data: { title: 'Started', type: 'ULWALUKO', hostId: user.id, eventDate: new Date('2026-11-14') } });
  });
  afterAll(async () => {
    const ids = [upcoming.id, started.id];
    await prisma.ceremonyChecklistItem.deleteMany({ where: { ceremonyId: { in: ids } } });
    await prisma.ceremony.deleteMany({ where: { id: { in: ids } } });
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.$disconnect();
  });

  it('adds the forms and medical steps to upcoming plans only, once', async () => {
    expect(await addUlwalukoRegistrationSteps({ now })).toMatchObject({ skipped: false });
    expect(await prisma.ceremonyChecklistItem.count({ where: { ceremonyId: upcoming.id } })).toBe(2);
    const labels = (await prisma.ceremonyChecklistItem.findMany({ where: { ceremonyId: upcoming.id } })).map((i) => i.label);
    expect(labels.some((l) => l.startsWith('Medical examination'))).toBe(true);
    expect(await prisma.ceremonyChecklistItem.count({ where: { ceremonyId: started.id } })).toBe(0);
    expect(await addUlwalukoRegistrationSteps({ now })).toMatchObject({ skipped: true });
  });
});
