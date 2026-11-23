import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import prisma from '../config/db.js';
import { FIX_NAME, mergeCete } from './clan-cete-merge-nov-2026.js';
import { clearClanIndexCache, matchClan } from '../services/clanMatchService.js';

const integrationDescribe = process.env.RUN_POSTGRES_INTEGRATION === 'true' ? describe : describe.skip;

// Two spellings of one clan (as AmaCethe and AmaCete were), with made-up
// names so real clans in the shared test database are never touched.
integrationDescribe('one clan, two spellings (real database)', () => {
  const FROM = 'AmaQothesttest';
  const TO = 'AmaQotesttest';
  let user;
  beforeAll(async () => {
    await prisma.dataFix.deleteMany({ where: { name: FIX_NAME } });
    const from = await prisma.clanGroup.create({ data: { clanName: FROM } });
    const to = await prisma.clanGroup.create({ data: { clanName: TO } });
    await prisma.clanAlias.create({ data: { aliasForm: 'MamQotesttest', clanGroupId: to.id } });
    await prisma.clanPraise.createMany({ data: [{ clanGroupId: from.id, praise: 'Qwathetest', sourceCount: 2 }, { clanGroupId: to.id, praise: 'Qwathetest', sourceCount: 1 }] });
    user = await prisma.user.create({ data: { email: `cete-${Date.now()}@example.test`, firstName: 'T', lastName: 'Test', passwordHash: 'x', paternalIziduko: FROM, clanGroupId: from.id } });
    clearClanIndexCache();
  });
  afterAll(async () => {
    await prisma.user.delete({ where: { id: user.id } });
    const ids = (await prisma.clanGroup.findMany({ where: { clanName: { in: [FROM, TO] } } })).map((g) => g.id);
    await prisma.clanAlias.deleteMany({ where: { clanGroupId: { in: ids } } });
    await prisma.clanPraise.deleteMany({ where: { clanGroupId: { in: ids } } });
    await prisma.clanGroup.deleteMany({ where: { id: { in: ids } } });
    await prisma.dataFix.deleteMany({ where: { name: FIX_NAME } });
    await prisma.$disconnect();
  });

  it('folds the old spelling into the clan, keeps it as a name and moves the member, once', async () => {
    expect(await mergeCete({ from: FROM, to: TO })).toMatchObject({ merged: true, skipped: false });
    const to = await prisma.clanGroup.findUnique({ where: { clanName: TO } });
    expect(await prisma.clanGroup.findUnique({ where: { clanName: FROM } })).toBeNull();
    expect((await prisma.user.findUnique({ where: { id: user.id } })).clanGroupId).toBe(to.id);
    expect(await prisma.clanPraise.findMany({ where: { clanGroupId: to.id, praise: 'Qwathetest' } })).toEqual([expect.objectContaining({ sourceCount: 2 })]);
    clearClanIndexCache();
    for (const form of [FROM, TO, 'MamQotesttest', 'Qotesttest']) {
      expect((await matchClan(form)).results[0]?.head, form).toBe(TO);
    }
    expect(await mergeCete({ from: FROM, to: TO })).toMatchObject({ skipped: true });
  });
});
