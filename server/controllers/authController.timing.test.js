import { describe, it, expect, vi, beforeEach } from 'vitest';

// Registration and password reset must not reveal, through how long they
// take, whether an email already has an account.
process.env.ACCOUNT_REPLY_FLOOR_MS = '150';
process.env.APP_URL = 'https://i-camagu.example';

const prisma = { user: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() } };
const hashPassword = vi.fn(async () => 'dummy-hash');

vi.mock('../config/db.js', () => ({ default: prisma }));
vi.mock('../config/email.js', () => ({ default: { emails: { send: vi.fn(async () => ({ error: null })) } }, FROM_ADDRESS: 'test@example.com' }));
vi.mock('../services/otpService.js', () => ({ createOtp: vi.fn(async () => '123456'), verifyOtp: vi.fn() }));
vi.mock('../services/tokenService.js', () => ({ generateTokenPair: vi.fn(), rotateToken: vi.fn() }));
vi.mock('../services/passwordService.js', () => ({ hashPassword, verifyPassword: vi.fn() }));
vi.mock('../services/googleAuthService.js', () => ({ verifyGoogleToken: vi.fn() }));
vi.mock('../services/izidukoService.js', () => ({ syncUserClanGroups: vi.fn(async () => {}) }));
vi.mock('../config/admin.js', () => ({ isAdminEmail: () => false }));

const auth = await import('./authController.js');

function fakeRes() {
  const res = { statusCode: 200, body: undefined };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
}

async function timed(handler, body) {
  const res = fakeRes();
  const started = Date.now();
  await handler({ body }, res);
  return { ms: Date.now() - started, status: res.statusCode, body: res.body };
}

const REGISTER = { email: 'someone@example.com', password: 'password123', firstName: 'A', lastName: 'B' };

describe('account replies take the same minimum time', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.user.create.mockResolvedValue({ id: 'new', email: 'someone@example.com' });
  });

  it('hashes the password and waits the floor for both new and existing addresses', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ id: 'existing', email: 'someone@example.com' });
    const existing = await timed(auth.registerWithPassword, REGISTER);
    prisma.user.findUnique.mockResolvedValueOnce(null);
    const fresh = await timed(auth.registerWithPassword, REGISTER);

    expect(hashPassword).toHaveBeenCalledTimes(2);
    expect(existing.ms).toBeGreaterThanOrEqual(145);
    expect(fresh.ms).toBeGreaterThanOrEqual(145);
    expect(existing.body).toEqual(fresh.body);
    expect(existing.status).toBe(fresh.status);
  });

  it('waits the floor on "email me a login code" whether or not the account exists', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);
    const unknown = await timed(auth.login, { email: 'nobody@example.com' });
    prisma.user.findUnique.mockResolvedValueOnce({ id: 'u1', email: 'someone@example.com' });
    const known = await timed(auth.login, { email: 'someone@example.com' });
    expect(unknown.ms).toBeGreaterThanOrEqual(145);
    expect(known.ms).toBeGreaterThanOrEqual(145);
    expect(unknown.body).toEqual(known.body);
  });

  it('waits the floor on password reset whether or not the account exists', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);
    const unknown = await timed(auth.requestPasswordReset, { email: 'nobody@example.com' });
    prisma.user.findUnique.mockResolvedValueOnce({ id: 'u1', email: 'someone@example.com', passwordHash: 'hash' });
    const known = await timed(auth.requestPasswordReset, { email: 'someone@example.com' });

    expect(unknown.ms).toBeGreaterThanOrEqual(145);
    expect(known.ms).toBeGreaterThanOrEqual(145);
    expect(unknown.body).toEqual(known.body);
  });
});
