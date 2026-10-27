import { describe, it, expect, vi, beforeEach } from 'vitest';

// SEC-02: these tests fail if sign-in ever again tells a stranger whether an
// email has an iCamagu account.
const prisma = { user: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() } };
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
vi.mock('../services/izidukoService.js', () => ({ syncUserClanGroups: vi.fn(async () => {}) }));
vi.mock('../config/admin.js', () => ({ isAdminEmail: () => false }));

const auth = await import('./authController.js');
const tokenService = await import('../services/tokenService.js');

function fakeRes() {
  const res = { statusCode: 200, body: undefined };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  res.cookie = vi.fn(() => res);
  res.clearCookie = vi.fn(() => res);
  return res;
}

async function call(handler, body, extra = {}) {
  const res = fakeRes();
  await handler({ body, ...extra }, res);
  return { status: res.statusCode, body: res.body };
}

const MEMBER = { id: 'user-1', email: 'member@example.com', passwordHash: 'hash' };

beforeEach(() => {
  vi.clearAllMocks();
  send.mockResolvedValue({ error: null });
  createOtp.mockResolvedValue('123456');
  prisma.user.create.mockResolvedValue({ ...MEMBER, emailVerificationRequired: true });
});

describe('password registration verification', () => {
  it('creates an unverified account, sends a code and does not issue a session', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);
    prisma.user.create.mockResolvedValueOnce({
      id: 'user-2', email: 'new@example.com', firstName: 'New', lastName: 'Member',
      passwordHash: 'dummy-hash', emailVerificationRequired: true,
    });

    const result = await call(auth.registerWithPassword, {
      email: 'new@example.com', password: 'password123', firstName: 'New', lastName: 'Member',
    });

    expect(result.status).toBe(201);
    expect(result.body.needsEmailVerification).toBe(true);
    expect(result.body.accessToken).toBeUndefined();
    expect(createOtp).toHaveBeenCalledWith('user-2');
    expect(tokenService.generateTokenPair).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(send).toHaveBeenCalledWith(expect.objectContaining({
      to: 'new@example.com', subject: 'Verify your iCamagu email',
    })));
  });
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

  it('marks a newly registered email verified after the correct code', async () => {
    checkOtp.mockResolvedValue({ ok: true });
    prisma.user.findUnique.mockResolvedValueOnce({ ...MEMBER, emailVerificationRequired: true });
    prisma.user.update.mockResolvedValueOnce({ ...MEMBER, emailVerificationRequired: false });
    const result = await call(auth.verifyOtp, { email: 'member@example.com', code: '123456' });
    expect(result.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'user-1' }, data: { emailVerificationRequired: false } });
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
  it('does not create a session for an unverified password registration', async () => {
    verifyPassword.mockResolvedValue(true);
    prisma.user.findUnique.mockResolvedValueOnce({ ...MEMBER, emailVerificationRequired: true });
    const result = await call(auth.loginWithPassword, { email: 'member@example.com', password: 'password123' });
    expect(result.status).toBe(403);
    expect(result.body.error).toMatch(/Verify your email/);
    expect(tokenService.generateTokenPair).not.toHaveBeenCalled();
  });

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

describe('password reset links', () => {
  it('uses the configured HTTPS origin instead of the request Host header', async () => {
    vi.stubEnv('APP_URL', 'https://i-camagu.co.za/path-is-ignored');
    prisma.user.findUnique.mockResolvedValueOnce(MEMBER);
    prisma.user.update.mockResolvedValueOnce(MEMBER);

    const req = {
      body: { email: MEMBER.email },
      protocol: 'http',
      get: vi.fn(() => 'attacker.example'),
    };
    const res = fakeRes();
    await auth.requestPasswordReset(req, res);
    await vi.waitFor(() => expect(send).toHaveBeenCalled());

    const message = send.mock.calls[0][0];
    expect(message.html).toContain('https://i-camagu.co.za/reset-password/');
    expect(message.html).not.toContain('attacker.example');
    vi.unstubAllEnvs();
  });

  it('does not send reset links when APP_URL is missing or invalid', async () => {
    vi.stubEnv('APP_URL', 'http://attacker.example');
    const res = await call(auth.requestPasswordReset, { email: MEMBER.email });
    expect(res.status).toBe(200);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });
});

describe('refresh session', () => {
  it('returns the user from the pre-rotation lookup and rotates the cookie', async () => {
    tokenService.rotateToken.mockResolvedValueOnce({
      accessToken: 'fresh-access',
      refreshToken: 'fresh-refresh',
      userId: 'user-1',
      user: MEMBER,
    });
    const res = fakeRes();
    await auth.refresh({ cookies: { jid: 'old-refresh' } }, res);
    expect(res.statusCode).toBe(200);
    expect(res.cookie).toHaveBeenCalledWith('jid', 'fresh-refresh', expect.any(Object));
    expect(res.body.accessToken).toBe('fresh-access');
    expect(res.body.user.email).toBe('member@example.com');
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(res.clearCookie).not.toHaveBeenCalled();
  });

  it('does not clear the refresh cookie on a transient database error', async () => {
    tokenService.rotateToken.mockRejectedValueOnce(new Error('database unavailable'));
    const res = fakeRes();
    await auth.refresh({ cookies: { jid: 'still-valid-refresh' } }, res);
    expect(res.statusCode).toBe(503);
    expect(res.clearCookie).not.toHaveBeenCalled();
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
