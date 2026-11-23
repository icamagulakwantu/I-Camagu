import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import prisma from '../config/db.js';
import { buildLiveExamples, FIX_NAME } from './live-examples-nov-2026.js';
import { exampleList, exampleView, EXAMPLE_REFUSAL } from '../services/exampleAccess.js';
import { verifyLedger, checkStokvelBalance } from '../services/ledgerService.js';

const integrationDescribe = process.env.RUN_POSTGRES_INTEGRATION === 'true' ? describe : describe.skip;

function run(req) {
  let status = null; let body = null; let nextCalled = false;
  const res = { status(c) { status = c; return res; }, json(d) { body = d; return res; }, set() { return res; } };
  const full = { query: {}, body: {}, ...req };
  exampleView(full, res, () => { nextCalled = true; });
  return { status, body, nextCalled, req: full };
}

integrationDescribe('live examples (real database)', () => {
  beforeAll(async () => {
    await prisma.dataFix.deleteMany({ where: { name: { startsWith: FIX_NAME } } });
    await buildLiveExamples();
  }, 120000);
  afterAll(async () => { await prisma.$disconnect(); });

  it('builds a grocery stokvel, a drinks pool and a ceremony, with books that verify and balance', async () => {
    const list = exampleList();
    expect(list.stokvels.map((s) => s.type).sort()).toEqual(['ALCOHOL_BULK_POOL', 'GROCERY_STOKVEL']);
    expect(list.ceremonies).toHaveLength(1);
    for (const s of list.stokvels) {
      expect((await verifyLedger(s.id)).ok).toBe(true);
      expect((await checkStokvelBalance(s.id)).agrees).toBe(true);
    }
    const grocery = list.stokvels.find((s) => s.type === 'GROCERY_STOKVEL');
    const count = async (table) => (await prisma.$queryRawUnsafe(`SELECT count(*)::int n FROM "${table}" WHERE "stokvelId" = $1`, grocery.id))[0].n;
    expect(await count('StokvelFine')).toBe(3);
    expect(await count('StokvelLoan')).toBe(3);
    expect(await count('StokvelMinutes')).toBe(3);
    expect(await prisma.contribution.count({ where: { stokvelId: grocery.id, status: 'PENDING' } })).toBe(4);
  });

  it('reads an example as its own person, and refuses every change', () => {
    const { id } = exampleList().stokvels[0];
    const read = run({ method: 'GET', path: `/stokvels/${id}/ledger` });
    expect(read.nextCalled).toBe(true);
    expect(read.req.exampleActAs).toBeTruthy();
    expect(run({ method: 'POST', path: `/stokvels/${id}/fines` })).toMatchObject({ status: 403, body: { error: EXAMPLE_REFUSAL } });
    expect(run({ method: 'POST', path: '/stokvels/contributions/submit', body: { stokvelId: id } })).toMatchObject({ status: 403 });
    expect(run({ method: 'GET', path: '/stokvels/my' }).req.exampleActAs).toBeUndefined();
  });

  it('builds only once', async () => {
    expect(await buildLiveExamples()).toMatchObject({ skipped: true });
    expect(await prisma.dataFix.findUnique({ where: { name: `${FIX_NAME}-building` } })).toBeNull();
  });

  it('leaves the build to another process that is already building', async () => {
    await prisma.dataFix.delete({ where: { name: FIX_NAME } });
    await prisma.dataFix.create({ data: { name: `${FIX_NAME}-building` } });
    try {
      expect(await buildLiveExamples({ retries: 0 })).toEqual({ skipped: true, busy: true });
    } finally {
      await prisma.dataFix.deleteMany({ where: { name: `${FIX_NAME}-building` } });
      await prisma.dataFix.create({ data: { name: FIX_NAME } });
    }
  });
});
