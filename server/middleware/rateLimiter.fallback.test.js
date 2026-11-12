import { describe, expect, it, vi } from 'vitest';

// The shared store's database is unreachable in this test.
vi.mock('../config/db.js', () => ({
  default: {
    $executeRawUnsafe: vi.fn(async () => { throw Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' }); }),
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
  },
}));

const { rateLimit, sharedStore } = await import('./rateLimiter.js');

function response() {
  const res = { statusCode: 200 };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = () => res;
  res.set = () => res;
  return res;
}

describe('rate limiter when the database is unavailable', () => {
  it('keeps limiting by counting in memory instead of letting every request through', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const limit = rateLimit({ windowMs: 60_000, max: 2, store: sharedStore });
    const req = { ip: '198.51.100.77', method: 'POST', baseUrl: '/api/auth', path: '/login', route: { path: '/login' } };
    const outcomes = [];
    for (let i = 0; i < 3; i += 1) {
      const res = response();
      let passed = false;
      await limit(req, res, () => { passed = true; });
      outcomes.push(passed ? 'allowed' : res.statusCode);
    }
    expect(outcomes).toEqual(['allowed', 'allowed', 429]);
  });
});
