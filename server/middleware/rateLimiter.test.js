import { describe, expect, it, vi } from 'vitest';
import { rateLimit } from './rateLimiter.js';

function request({ ip, path, routePath, method = 'POST', baseUrl = '/api/stokvels' }) {
  return { ip, path, method, baseUrl, route: routePath ? { path: routePath } : undefined };
}

function response() {
  const res = { statusCode: 200, body: undefined };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
}

describe('rateLimit route identity', () => {
  it('shares a limit across different values for the same route parameter', () => {
    const limit = rateLimit({ windowMs: 60_000, max: 1 });
    const nextA = vi.fn();
    const first = response();
    limit(request({
      ip: '198.51.100.41',
      path: '/invite-a/respond',
      routePath: '/:inviteId/respond',
    }), first, nextA);

    const nextB = vi.fn();
    const second = response();
    limit(request({
      ip: '198.51.100.41',
      path: '/invite-b/respond',
      routePath: '/:inviteId/respond',
    }), second, nextB);

    expect(nextA).toHaveBeenCalledOnce();
    expect(second.statusCode).toBe(429);
    expect(nextB).not.toHaveBeenCalled();
  });

  it('keeps separate route templates on separate limits', () => {
    const limit = rateLimit({ windowMs: 60_000, max: 1 });
    const first = response();
    const nextFirst = vi.fn();
    limit(request({
      ip: '198.51.100.42',
      path: '/invite-a/respond',
      routePath: '/:inviteId/respond',
    }), first, nextFirst);

    const second = response();
    const nextSecond = vi.fn();
    limit(request({
      ip: '198.51.100.42',
      path: '/join',
      routePath: '/join',
    }), second, nextSecond);

    expect(nextFirst).toHaveBeenCalledOnce();
    expect(nextSecond).toHaveBeenCalledOnce();
    expect(second.statusCode).toBe(200);
  });
});
