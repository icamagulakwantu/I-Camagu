import crypto from 'crypto';
import prisma from '../config/db.js';

const OTP_EXPIRY_MINUTES = 10;
// After this many wrong codes in the lockout window, every open code for the
// person is cancelled and they must wait, so nobody can guess a 6-digit code.
const MAX_FAILED_ATTEMPTS = 5;

// Wrong guesses are counted in their own small table, created the first time
// it is needed (same approach as the stokvel invitations table).
let tableReady = null;
function ensureAttemptsTable() {
  if (!tableReady) {
    tableReady = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "OtpFailedAttempt" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await prisma.$executeRawUnsafe(
        'CREATE INDEX IF NOT EXISTS "OtpFailedAttempt_userId_createdAt_idx" ON "OtpFailedAttempt" ("userId", "createdAt");'
      );
    })().catch((err) => {
      tableReady = null; // try again next request
      throw err;
    });
  }
  return tableReady;
}

const hashCode = (code) => crypto.createHash('sha256').update(String(code)).digest('hex');

// Generates a 6-digit code with a secure random generator and stores only its
// hash. Any older code still waiting is cancelled, so only the newest works.
export async function createOtp(userId) {
  const code = crypto.randomInt(100000, 1000000).toString();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await prisma.otpCode.updateMany({ where: { userId, consumedAt: null }, data: { consumedAt: new Date() } });
  await prisma.otpCode.create({ data: { userId, codeHash: hashCode(code), expiresAt } });

  return code; // the raw code — only returned so we can email it; never stored raw
}

async function recentFailures(userId) {
  const [row] = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS n FROM "OtpFailedAttempt"
    WHERE "userId" = ${userId} AND "createdAt" > NOW() - INTERVAL '15 minutes'`;
  return Number(row?.n || 0);
}

async function recordFailure(userId) {
  await prisma.$executeRaw`
    INSERT INTO "OtpFailedAttempt" ("id", "userId") VALUES (${crypto.randomUUID()}, ${userId})`;
  const failures = await recentFailures(userId);
  if (failures >= MAX_FAILED_ATTEMPTS) {
    await prisma.otpCode.updateMany({ where: { userId, consumedAt: null }, data: { consumedAt: new Date() } });
    return { ok: false, locked: true };
  }
  return { ok: false, locked: false, attemptsLeft: MAX_FAILED_ATTEMPTS - failures };
}

// Checks a submitted code against the person's newest open code.
// Returns { ok } on success, or { ok: false, locked, attemptsLeft }.
export async function verifyOtp(userId, submittedCode) {
  const id = String(userId || '');
  const code = String(submittedCode || '').trim();
  await ensureAttemptsTable();

  if ((await recentFailures(id)) >= MAX_FAILED_ATTEMPTS) return { ok: false, locked: true };
  if (!/^\d{6}$/.test(code)) return recordFailure(id);

  const otp = await prisma.otpCode.findFirst({
    where: { userId: id, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });

  // Constant-time comparison, so response timing reveals nothing about the code.
  const valid = Boolean(otp) && crypto.timingSafeEqual(
    Buffer.from(otp.codeHash, 'hex'),
    Buffer.from(hashCode(code), 'hex')
  );
  if (!valid) return recordFailure(id);

  // Mark as used, only if still open, so the same code cannot log in twice.
  const claim = await prisma.otpCode.updateMany({
    where: { id: otp.id, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  if (claim.count === 0) return { ok: false, locked: false };

  await prisma.$executeRaw`DELETE FROM "OtpFailedAttempt" WHERE "userId" = ${id}`;
  return { ok: true };
}
