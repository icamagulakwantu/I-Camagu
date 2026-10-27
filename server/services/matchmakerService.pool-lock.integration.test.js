import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import prisma from '../config/db.js';
import { lockOpenPoolForJoin } from './matchmakerService.js';

const integrationDescribe = process.env.RUN_POSTGRES_INTEGRATION === 'true' ? describe : describe.skip;

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

integrationDescribe('PostgreSQL SmartMatch pool row-lock integration', () => {
  let userId;
  let poolId;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email: `pool-lock-integration-${randomUUID()}@example.invalid`,
        firstName: 'Pool Lock',
        lastName: 'Integration',
      },
      select: { id: true },
    });
    userId = user.id;

    const pool = await prisma.bulkPool.create({
      data: {
        category: 'TAVERN',
        area: 'Disposable integration test',
        moqTarget: 50,
        status: 'OPEN',
        createdById: userId,
      },
      select: { id: true },
    });
    poolId = pool.id;
  });

  afterAll(async () => {
    if (poolId) await prisma.bulkPool.deleteMany({ where: { id: poolId } });
    if (userId) await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it('makes a concurrent join wait for matching, then rejects it after the pool closes', async () => {
    const rowLocked = deferred();
    const allowMatchToCommit = deferred();
    const joinAttemptStarted = deferred();

    const matchingTransaction = prisma.$transaction(async (tx) => {
      await lockOpenPoolForJoin(tx, poolId);
      rowLocked.resolve();
      await allowMatchToCommit.promise;
      await tx.bulkPool.update({ where: { id: poolId }, data: { status: 'MATCHED' } });
    });

    await rowLocked.promise;

    const joiningTransaction = prisma.$transaction(async (tx) => {
      joinAttemptStarted.resolve();
      await lockOpenPoolForJoin(tx, poolId);
    });

    await joinAttemptStarted.promise;
    allowMatchToCommit.resolve();

    await matchingTransaction;
    await expect(joiningTransaction).rejects.toThrow('This pool is no longer open');

    const finalPool = await prisma.bulkPool.findUnique({ where: { id: poolId }, select: { status: true } });
    expect(finalPool.status).toBe('MATCHED');
  });
});
