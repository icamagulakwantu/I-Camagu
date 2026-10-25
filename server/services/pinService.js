import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from '../config/db.js';

// Wrong PINs are counted per person in the database (not per IP or per
// server process), so the limit holds across restarts, multiple instances
// and changing IP addresses. After MAX_FAILED_PIN_ATTEMPTS wrong PINs inside
// the window, every further try is refused until the window passes.
const MAX_FAILED_PIN_ATTEMPTS = 5;
const PIN_LOCK_MINUTES = 15;

// Same create-on-first-use approach as the OTP attempts table.
let tableReady = null;
function ensurePinAttemptsTable() {
  if (!tableReady) {
    tableReady = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "PinFailedAttempt" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await prisma.$executeRawUnsafe(
        'CREATE INDEX IF NOT EXISTS "PinFailedAttempt_userId_createdAt_idx" ON "PinFailedAttempt" ("userId", "createdAt");'
      );
    })().catch((err) => {
      tableReady = null; // try again next request
      throw err;
    });
  }
  return tableReady;
}

async function recentPinAttempts(userId) {
  const [row] = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS n FROM "PinFailedAttempt"
    WHERE "userId" = ${userId} AND "createdAt" > NOW() - INTERVAL '15 minutes'`;
  return Number(row?.n || 0);
}

export async function hashPin(pin) {
  return bcrypt.hash(String(pin), 10);
}

export function validatePinFormat(pin) {
  return typeof pin === 'string' && /^\d{4,6}$/.test(pin);
}

export const setPin = async (userId, pin) => {
  if (!validatePinFormat(pin)) {
    throw new Error('PIN must be 4-6 digits');
  }
  const pinHash = await hashPin(pin);
  return prisma.user.update({
    where: { id: userId },
    data: { pinHash },
  });
};

// Returns { valid: true } or { valid: false, reason, attemptsLeft? } where
// reason is NO_PIN_SET, INCORRECT_PIN or LOCKED. Never logs the PIN or hash.
export async function verifyPin(userId, pin) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { pinHash: true } });
  if (!user?.pinHash) return { valid: false, reason: 'NO_PIN_SET' };

  await ensurePinAttemptsTable();
  if ((await recentPinAttempts(userId)) >= MAX_FAILED_PIN_ATTEMPTS) return { valid: false, reason: 'LOCKED' };

  // The attempt is counted BEFORE the PIN is checked, so a burst of
  // simultaneous guesses cannot all slip past the limit. A correct PIN
  // clears the count again.
  await prisma.$executeRaw`
    INSERT INTO "PinFailedAttempt" ("id", "userId") VALUES (${crypto.randomUUID()}, ${userId})`;
  const attempts = await recentPinAttempts(userId);
  if (attempts > MAX_FAILED_PIN_ATTEMPTS) return { valid: false, reason: 'LOCKED' };

  const valid = await bcrypt.compare(String(pin), user.pinHash);
  if (valid) {
    await prisma.$executeRaw`DELETE FROM "PinFailedAttempt" WHERE "userId" = ${userId}`;
    return { valid: true, reason: null };
  }
  if (attempts >= MAX_FAILED_PIN_ATTEMPTS) return { valid: false, reason: 'LOCKED' };
  return { valid: false, reason: 'INCORRECT_PIN', attemptsLeft: MAX_FAILED_PIN_ATTEMPTS - attempts };
}

// One shared wording for every screen that asks for the PIN.
export function pinFailureResponse(check) {
  if (check.reason === 'NO_PIN_SET') {
    return { status: 401, error: 'You need to set a security PIN first — go to More → Security PIN.' };
  }
  if (check.reason === 'LOCKED') {
    return { status: 429, error: `Too many wrong PINs. Wait ${PIN_LOCK_MINUTES} minutes, then try again.` };
  }
  const left = check.attemptsLeft ? ` You have ${check.attemptsLeft} tries left.` : '';
  return { status: 401, error: `Incorrect PIN.${left}` };
}

export const hasPinSet = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { pinHash: true },
  });
  return Boolean(user?.pinHash);
};

export const checkPinStatus = async (userId) => {
  const isSet = await hasPinSet(userId);
  return { isPinSet: isSet };
};

export default {
  hashPin,
  validatePinFormat,
  setPin,
  setUserPin: setPin,
  verifyPin,
  pinFailureResponse,
  hasPinSet,
  checkPinStatus,
};
