import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import prisma from '../config/db.js';
import { findClanMatches } from './izidukoService.js';
import { clearClanIndexCache } from './clanMatchService.js';

const integrationDescribe = process.env.RUN_POSTGRES_INTEGRATION === 'true' ? describe : describe.skip;

integrationDescribe('umnombo in clan matches (real database)', () => {
  const ids = [];
  const make = async (name) => {
    const u = await prisma.user.create({ data: {
      email: `line-${name}-${Date.now()}@example.invalid`, firstName: name, lastName: 'Test', passwordHash: 'x',
      profileImage: 'x.jpg', paternalIziduko: 'AmaZzlinetest', maternalIziduko: 'AmaZzlinetestb',
    } });
    ids.push(u.id);
    return u;
  };
  let a, b, c;
  beforeAll(async () => {
    await prisma.clanGroup.upsert({ where: { clanName: 'AmaZzlinetest' }, update: {}, create: { clanName: 'AmaZzlinetest' } });
    clearClanIndexCache();
    a = await make('A'); b = await make('B'); c = await make('C');
    await prisma.lineage.create({ data: { userId: a.id, shareForMatching: true, ancestors: [{ generation: 1, name: 'Sipho' }, { generation: 4, name: 'Ngubengcuka' }] } });
    await prisma.lineage.create({ data: { userId: b.id, shareForMatching: true, ancestors: [{ generation: 1, name: 'Thando' }, { generation: 6, name: 'Ngubengcuka' }] } });
    // C names the same ancestor but has not chosen to share.
    await prisma.lineage.create({ data: { userId: c.id, shareForMatching: false, ancestors: [{ generation: 2, name: 'Ngubengcuka' }] } });
  });
  afterAll(async () => {
    await prisma.lineage.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.clanGroup.deleteMany({ where: { clanName: 'AmaZzlinetest' } });
    await prisma.$disconnect();
  });

  it('names the shared ancestor only when both share their line, and never the whole line', async () => {
    const matches = await findClanMatches(a.id);
    const withB = matches.find((m) => m.id === b.id);
    const withC = matches.find((m) => m.id === c.id);
    expect(withB.sharedAncestors).toEqual([{ name: 'Ngubengcuka', myGeneration: 4, theirGeneration: 6 }]);
    expect(withC.sharedAncestors).toEqual([]);
    expect(JSON.stringify(withB)).not.toContain('Thando');
  });
});
