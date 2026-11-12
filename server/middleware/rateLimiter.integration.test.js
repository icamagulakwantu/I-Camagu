import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import prisma from '../config/db.js';
import { postgresStore, rateLimit } from './rateLimiter.js';

const integrationDescribe = process.env.RUN_POSTGRES_INTEGRATION === 'true' ? describe : describe.skip;

function response() {
  const res = { statusCode: 200, body: undefined };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  res.set = () => res;
  return res;
}

// Calls the middleware and resolves with whether the request was let through.
function attempt(limit, ip) {
  return new Promise((resolve) => {
    const res = response();
    const req = { ip, method: 'POST', baseUrl: '/api/auth', path: '/login', route: { path: '/login' } };
    Promise.resolve(limit(req, res, () => resolve(true))).then(() => {
      if (res.statusCode === 429) resolve(false);
    });
  });
}

integrationDescribe('PostgreSQL rate limiter (real database)', () => {
  beforeAll(async () => {
    await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "RateLimitCounter"');
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('shares one allowance between two server instances', async () => {
    const ip = `198.51.100.${Math.floor(Math.random() * 200)}-${randomUUID()}`;
    const serverA = rateLimit({ windowMs: 60_000, max: 3, store: postgresStore });
    const serverB = rateLimit({ windowMs: 60_000, max: 3, store: postgresStore });
    const results = [];
    for (const limit of [serverA, serverB, serverA, serverB, serverA]) results.push(await attempt(limit, ip));
    expect(results).toEqual([true, true, true, false, false]);
  });

  it('lets exactly the limit through when requests arrive at the same moment', async () => {
    const ip = `203.0.113.${randomUUID()}`;
    const limit = rateLimit({ windowMs: 60_000, max: 5, store: postgresStore });
    const results = await Promise.all(Array.from({ length: 20 }, () => attempt(limit, ip)));
    expect(results.filter(Boolean)).toHaveLength(5);
  });

  it('starts a fresh allowance once the window has passed', async () => {
    const ip = `192.0.2.${randomUUID()}`;
    const limit = rateLimit({ windowMs: 1_000, max: 1, store: postgresStore });
    expect(await attempt(limit, ip)).toBe(true);
    expect(await attempt(limit, ip)).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 1_200));
    expect(await attempt(limit, ip)).toBe(true);
  });

  it('never stores the visitor’s IP address', async () => {
    const ip = `198.51.100.250-${randomUUID()}`;
    await attempt(rateLimit({ windowMs: 60_000, max: 3, store: postgresStore }), ip);
    const rows = await prisma.$queryRaw`SELECT "key" FROM "RateLimitCounter" WHERE "key" LIKE ${`%${ip}%`}`;
    expect(rows).toHaveLength(0);
  });
});
