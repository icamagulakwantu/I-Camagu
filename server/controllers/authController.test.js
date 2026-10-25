import { describe, it, expect, vi, beforeEach } from 'vitest';

// SEC-02: these tests fail if sign-in ever again tells a stranger whether an
// email has an iCamagu account.
const prisma = { user: { findUnique: vi.fn() } };
const send = vi.fn();
const createOtp = vi.fn();
const checkOtp = vi.fn();
const verifyPassword = vi.fn();

vi.mock('../config/db.js', () => ({ default: prisma }));
vi.mock('../config/email.js', () => ({ default: { emails: { send } }, FROM_ADDRESS: 'test@example.com' }));
vi.mock('../services/otpService.js', () => ({ createOtp, verifyOtp: checkOtp }));
vi.mock('../services/tokenService.js', () => ({
  generateTokenPair: vi.fn(async () => ({ accessToken: 'access', refreshToken: 'refresh' })),
  rotateToken: vi.fn(),
}));
vi.mock('../services/passwordService.js', () => ({ hashPassword: vi.fn(async () => 'dummy-hash'), verifyPassword }));
vi.mock('../services/googleAuthService.js', () => ({ verifyGoogleToken: vi.fn() }));
vi.mock('../config/admin.js', () => ({ isAdminEmail: () => false }));

const auth = await import('./authController.js');

function fakeRes() {
  const res = { statusCode: 200, body: undefined };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  res.cookie = () => res;
  return res;
}

async function call(handler, body) {
  const res = fakeRes();
  await handler({ body }, res);
  return { status: res.statusCode, body: res.body };
}

const MEMBER = { id: 'user-1', email: 'member@example.com', passwordHash: 'hash' };

beforeEach(() => {
  vi.clearAllMocks();
  send.mockResolvedValue({ error: null });
  createOtp.mockResolvedValue('123456');
});

describe('email me a login code', () => {
  it('gives the same reply whether or not the email has an account', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(MEMBER);
    const known = await call(auth.login, { email: 'member@example.com' });
    prisma.user.findUnique.mockResolvedValueOnce(null);
    const unknown = await call(auth.login, { email: 'stranger@example.com' });

    expect(known).toEqual(unknown);
    expect(known).toEqual({ status: 200, body: { message: auth.OTP_SENT_MESSAGE } });
    expect(JSON.stringify(known.body)).not.toContain('user-1');
  });

  it('only creates and sends a code for a real account', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);
    await call(auth.login, { email: 'stranger@example.com' });
    expect(createOtp).not.toHaveBeenCalled();

    prisma.user.findUnique.mockResolvedValueOnce(MEMBER);
    await call(auth.login, { email: 'member@example.com' });
    expect(createOtp).toHaveBeenCalledWith('user-1');
  });

  it('gives the same reply when the email fails to send', async () => {
    send.mockResolvedValueOnce({ error: { message: 'mail down' } });
    prisma.user.findUnique.mockResolvedValueOnce(MEMBER);
    const result = await call(auth.login, { email: 'member@example.com' });
    expect(result).toEqual({ status: 200, body: { message: auth.OTP_SENT_MESSAGE } });
  });
});

describe('enter the login code', () => {
  it('treats a wrong code for a missing account exactly like one for a real account', async () => {
    checkOtp.mockResolvedValue({ ok: false, locked: false, attemptsLeft: 4 });
    prisma.user.findUnique.mockResolvedValueOnce(MEMBER);
    const known = await call(auth.verifyOtp, { email: 'member@example.com', code: '000000' });
    prisma.user.findUnique.mockResolvedValueOnce(null);
    const unknown = await call(auth.verifyOtp, { email: 'stranger@example.com', code: '000000' });

    expect(known).toEqual(unknown);
    expect(known.status).toBe(401);
    // Wrong guesses for a missing account are still counted, so it locks the same way.
    expect(checkOtp).toHaveBeenLastCalledWith('no-account:stranger@example.com', '000000');
  });

  it('never signs in a missing account, even if the code check passed', async () => {
    checkOtp.mockResolvedValue({ ok: true });
    prisma.user.findUnique.mockResolvedValueOnce(null);
    const result = await call(auth.verifyOtp, { email: 'stranger@example.com', code: '123456' });
    expect(result.status).toBe(401);
  });

  it('signs in a real account with the right code', async () => {
    checkOtp.mockResolvedValue({ ok: true });
    prisma.user.findUnique.mockResolvedValueOnce(MEMBER);
    const result = await call(auth.verifyOtp, { email: 'member@example.com', code: '123456' });
    expect(result.status).toBe(200);
    expect(result.body.accessToken).toBe('access');
    expect(checkOtp).toHaveBeenCalledWith('user-1', '123456');
  });
});

describe('password sign-in', () => {
  it('does the same slow password check when there is no account', async () => {
    verifyPassword.mockResolvedValue(false);
    prisma.user.findUnique.mockResolvedValueOnce(null);
    const unknown = await call(auth.loginWithPassword, { email: 'stranger@example.com', password: 'guess1234' });
    prisma.user.findUnique.mockResolvedValueOnce(MEMBER);
    const known = await call(auth.loginWithPassword, { email: 'member@example.com', password: 'guess1234' });

    expect(unknown).toEqual(known);
    expect(verifyPassword).toHaveBeenCalledTimes(2);
  });
});

describe('the old email check', () => {
  it('no longer answers whether an account exists', async () => {
    prisma.user.findUnique.mockResolvedValue(MEMBER);
    const result = await call(auth.checkEmail, { email: 'member@example.com' });
    expect(result.status).toBe(410);
    expect(result.body).not.toHaveProperty('exists');
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
