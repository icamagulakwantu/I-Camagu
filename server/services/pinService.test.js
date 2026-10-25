import { describe, it, expect, vi, beforeEach } from 'vitest';

// The PIN guards every money approval, so the lockout rules are tested here
// against a fake database that counts attempts the way Postgres would.
let attempts = [];
const mockPrisma = {
  user: { findUnique: vi.fn() },
  $executeRawUnsafe: vi.fn(async () => 0),
  $executeRaw: vi.fn(async (strings) => {
    const sql = strings.join('?');
    if (sql.includes('INSERT INTO "PinFailedAttempt"')) attempts.push(Date.now());
    if (sql.includes('DELETE FROM "PinFailedAttempt"')) attempts = [];
    return 1;
  }),
  $queryRaw: vi.fn(async () => [{ n: attempts.length }]),
};
vi.mock('../config/db.js', () => ({ default: mockPrisma }));

const bcrypt = (await import('bcryptjs')).default;
const { verifyPin, pinFailureResponse } = await import('./pinService.js');

const PIN_HASH = await bcrypt.hash('2468', 4);

beforeEach(() => {
  attempts = [];
  vi.clearAllMocks();
  mockPrisma.user.findUnique.mockResolvedValue({ pinHash: PIN_HASH });
});

describe('verifyPin', () => {
  it('reports NO_PIN_SET without counting an attempt', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ pinHash: null });
    expect(await verifyPin('u1', '1234')).toEqual({ valid: false, reason: 'NO_PIN_SET' });
    expect(attempts).toHaveLength(0);
  });

  it('accepts the correct PIN and clears earlier wrong attempts', async () => {
    await verifyPin('u1', '0000');
    await verifyPin('u1', '0000');
    expect(attempts).toHaveLength(2);
    expect((await verifyPin('u1', '2468')).valid).toBe(true);
    expect(attempts).toHaveLength(0);
  });

  it('counts down remaining tries on wrong PINs', async () => {
    expect(await verifyPin('u1', '0000')).toMatchObject({ reason: 'INCORRECT_PIN', attemptsLeft: 4 });
    expect(await verifyPin('u1', '0000')).toMatchObject({ reason: 'INCORRECT_PIN', attemptsLeft: 3 });
  });

  it('locks after 5 wrong PINs and then refuses even the correct PIN', async () => {
    for (let i = 0; i < 4; i += 1) await verifyPin('u1', '0000');
    expect((await verifyPin('u1', '0000')).reason).toBe('LOCKED');
    expect(await verifyPin('u1', '2468')).toEqual({ valid: false, reason: 'LOCKED' });
  });
});

describe('pinFailureResponse', () => {
  it('maps a lockout to HTTP 429 and never echoes the PIN', () => {
    const out = pinFailureResponse({ valid: false, reason: 'LOCKED' });
    expect(out.status).toBe(429);
    expect(out.error).toMatch(/Too many wrong PINs/);
  });

  it('tells the person how many tries are left', () => {
    expect(pinFailureResponse({ valid: false, reason: 'INCORRECT_PIN', attemptsLeft: 2 }).error)
      .toBe('Incorrect PIN. You have 2 tries left.');
  });
});
