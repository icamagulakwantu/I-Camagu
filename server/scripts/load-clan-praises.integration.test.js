import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import prisma from '../config/db.js';
import { loadClanPraises, readClanPraises } from './load-clan-praises.js';
import { searchClans, matchClan, clearClanIndexCache } from '../services/clanMatchService.js';

const integrationDescribe = process.env.RUN_POSTGRES_INTEGRATION === 'true' ? describe : describe.skip;

integrationDescribe('clan praise names (real database)', () => {
  let cirha;
  beforeAll(async () => {
    await prisma.clanPraise.deleteMany({});
    cirha = await prisma.clanGroup.upsert({ where: { clanName: 'AmaCirha' }, update: {}, create: { clanName: 'AmaCirha' } });
    clearClanIndexCache();
  });
  afterAll(async () => { await prisma.$disconnect(); });

  it('ships a clean list', () => {
    const clans = readClanPraises();
    expect(clans.length).toBeGreaterThan(100);
    expect(clans.every((c) => c.clan.startsWith('Ama') && c.praises.length > 0)).toBe(true);
  });

  it('loads into the existing clan, adds missing clans, and changes nothing the second time', async () => {
    const first = await loadClanPraises();
    expect(first.addedPraises).toBeGreaterThan(1000);
    expect(await prisma.clanGroup.count({ where: { clanName: 'AmaCirha' } })).toBe(1);
    expect(await prisma.clanPraise.count({ where: { clanGroupId: cirha.id } })).toBeGreaterThan(5);
    expect(await loadClanPraises()).toEqual({ createdClans: 0, addedPraises: 0, removedPraises: 0 });
  });

  it('removes a praise that was taken out of the list', async () => {
    await prisma.clanPraise.create({ data: { clanGroupId: cirha.id, praise: 'Mfengu/Hlubi', sourceCount: 1 } });
    const res = await loadClanPraises();
    expect(res.removedPraises).toBe(1);
    expect(await prisma.clanPraise.count({ where: { praise: 'Mfengu/Hlubi' } })).toBe(0);
  });

  it('finds a clan by one of its praises and shows its praises', async () => {
    clearClanIndexCache();
    const res = await searchClans('Ncibane');
    const hit = res.results.find((r) => r.head === 'AmaCirha');
    expect(hit).toMatchObject({ matchedAs: 'praise' });
    expect(hit.praises).toContain('Nojaholo');
  });

  it("ranks a clan's own name above a praise that matches", async () => {
    const res = await searchClans('Cirha');
    expect(res.results[0].head).toBe('AmaCirha');
  });

  it('never confirms a clan identity from a praise alone', async () => {
    const res = await matchClan('Nojaholo');
    expect(res.autoSelect).toBe(false);
    expect(res.results.some((r) => r.matchedAs === 'praise')).toBe(false);
  });
});
