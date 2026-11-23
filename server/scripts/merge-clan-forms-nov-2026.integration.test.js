import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import prisma from '../config/db.js';
import { FIX_NAME, mergeClanForms } from './merge-clan-forms-nov-2026.js';
import { clearClanIndexCache, matchClan } from '../services/clanMatchService.js';

const integrationDescribe = process.env.RUN_POSTGRES_INTEGRATION === 'true' ? describe : describe.skip;

// The register as production had it (Tshawe beside AmaTshawe, Mamzangwa and
// Mzangwa beside AmaZangwa, Mamcete as a clan of its own), with made-up clan
// names so the test never touches real clans in the shared test database.
const MERGES = [['Qatestwe', 'AmaQatestwe'], ['Mamzotestwa', 'AmaZotestwa'], ['Mzotestwa', 'AmaZotestwa']];
const RENAMES = [['Mamcotest', 'AmaCotest']];
integrationDescribe('one clan, one entry (real database)', () => {
  const made = [];
  const users = [];
  let tshawe; let amaQatestwe; let amaZotestwa;
  const clan = async (clanName) => { const g = await prisma.clanGroup.upsert({ where: { clanName }, update: {}, create: { clanName } }); made.push(g.id); return g; };
  const member = async (paternalIziduko, lastName) => {
    const u = await prisma.user.create({ data: { email: `clanforms-${users.length}-${Date.now()}@example.test`, firstName: 'Test', lastName, passwordHash: 'x', paternalIziduko } });
    users.push(u.id);
    return u;
  };

  beforeAll(async () => {
    await prisma.dataFix.deleteMany({ where: { name: FIX_NAME } });
    amaQatestwe = await clan('AmaQatestwe');
    tshawe = await clan('Qatestwe');
    amaZotestwa = await clan('AmaZotestwa');
    await clan('Mamzotestwa');
    await clan('Mzotestwa');
    await clan('Mamcotest');
    await prisma.clanAlias.upsert({ where: { aliasForm: 'MamQatestwe' }, update: { clanGroupId: amaQatestwe.id }, create: { aliasForm: 'MamQatestwe', clanGroupId: amaQatestwe.id } });
    await prisma.clanPraise.createMany({ data: [
      { clanGroupId: amaQatestwe.id, praise: 'Ngconde', sourceCount: 3 },
      { clanGroupId: tshawe.id, praise: 'Ngconde', sourceCount: 4 },
      { clanGroupId: tshawe.id, praise: 'Togu', sourceCount: 1 },
    ], skipDuplicates: true });
    await prisma.surnameSubgroup.create({ data: { clanGroupId: tshawe.id, surname: 'Clanformstest' } });
    await member('Qatestwe', 'Clanformstest');
    await member('MamQatestwe', 'Clanformstest');
    await member('Mzotestwa', 'Clanformstest');
    clearClanIndexCache();
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    const ids = (await prisma.clanGroup.findMany({ where: { clanName: { in: ['AmaQatestwe', 'Qatestwe', 'AmaZotestwa', 'Mamzotestwa', 'Mzotestwa', 'Mamcotest', 'AmaCotest'] } } })).map((g) => g.id);
    await prisma.clanAlias.deleteMany({ where: { clanGroupId: { in: ids } } });
    await prisma.clanPraise.deleteMany({ where: { clanGroupId: { in: ids } } });
    await prisma.surnameSubgroup.deleteMany({ where: { clanGroupId: { in: ids } } });
    await prisma.clanGroup.deleteMany({ where: { id: { in: ids } } });
    await prisma.dataFix.deleteMany({ where: { name: FIX_NAME } });
    await prisma.$disconnect();
  });

  it('shows the problem first: a plain name matched two clans, so nobody was linked', async () => {
    const before = await matchClan('Qatestwe');
    expect(before.autoSelect).toBe(false);
    expect(before.results).toHaveLength(2);
  });

  it('folds every form into its clan, links members, keeps the forms as names, once', async () => {
    const r = await mergeClanForms({ merges: MERGES, renames: RENAMES });
    expect(r).toMatchObject({ skipped: false });
    expect(r.merged).toBeGreaterThanOrEqual(3);
    expect(r.renamed).toBeGreaterThanOrEqual(1);

    expect(await prisma.clanGroup.findUnique({ where: { clanName: 'Qatestwe' } })).toBeNull();
    expect(await prisma.clanGroup.findUnique({ where: { clanName: 'Mamzotestwa' } })).toBeNull();
    expect(await prisma.clanGroup.findUnique({ where: { clanName: 'Mamcotest' } })).toBeNull();
    expect(await prisma.clanGroup.findUnique({ where: { clanName: 'AmaCotest' } })).not.toBeNull();

    // Praise names and surname groups moved, the better count kept, no doubles.
    const praises = await prisma.clanPraise.findMany({ where: { clanGroupId: amaQatestwe.id } });
    expect(praises.filter((p) => p.praise === 'Ngconde')).toEqual([expect.objectContaining({ sourceCount: 4 })]);
    expect(praises.map((p) => p.praise)).toContain('Togu');
    expect(await prisma.surnameSubgroup.findFirst({ where: { clanGroupId: amaQatestwe.id, surname: 'Clanformstest' } })).not.toBeNull();

    // Every form now confirms one clan straight away.
    clearClanIndexCache();
    for (const form of ['Qatestwe', 'AmaQatestwe', 'MamQatestwe', 'MaQatestwe', 'ngu Qatestwe']) {
      const m = await matchClan(form);
      expect(m.autoSelect, form).toBe(true);
      expect(m.results[0].id, form).toBe(amaQatestwe.id);
    }
    for (const form of ['Mzotestwa', 'Mamzotestwa', 'MamZotestwa', 'Zotestwa']) {
      expect((await matchClan(form)).results[0]?.id, form).toBe(amaZotestwa.id);
    }
    expect((await matchClan('Cotest')).results[0]?.head).toBe('AmaCotest');
    expect((await matchClan('Mamcotest')).results[0]?.head).toBe('AmaCotest');

    // Members are linked to their clan.
    const linked = await prisma.user.findMany({ where: { id: { in: users } }, select: { paternalIziduko: true, clanGroupId: true } });
    for (const u of linked) {
      expect(u.clanGroupId, u.paternalIziduko).toBe(u.paternalIziduko === 'Mzotestwa' ? amaZotestwa.id : amaQatestwe.id);
    }

    expect(await mergeClanForms({ merges: MERGES, renames: RENAMES })).toMatchObject({ skipped: true });
  });
});
