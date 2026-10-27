import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../config/db.js';

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET;

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 30;
const INACTIVITY_LIMIT_DAYS = 7;

export async function generateTokenPair(userId, oldRefreshToken = null) {
  const accessToken = jwt.sign({ userId }, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });

  const refreshToken = jwt.sign(
    { userId, salt: crypto.randomBytes(16).toString('hex') },
    REFRESH_TOKEN_SECRET,
    { expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d` }
  );

  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  await prisma.$transaction(async (tx) => {
    if (oldRefreshToken) {
      const oldHash = crypto.createHash('sha256').update(oldRefreshToken).digest('hex');
      const revoked = await tx.refreshToken.updateMany({
        where: { tokenHash: oldHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (revoked.count !== 1) {
        // A concurrent refresh already rotated this token. Do not create a
        // second child token and do not treat a tab race as token theft.
        throw new Error('REFRESH_TOKEN_ALREADY_ROTATED');
      }
    }

    await tx.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });
  });

  return { accessToken, refreshToken };
}

export async function rotateToken(presentedRefreshToken) {
  const decoded = jwt.verify(presentedRefreshToken, REFRESH_TOKEN_SECRET);
  const tokenHash = crypto.createHash('sha256').update(presentedRefreshToken).digest('hex');

  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!stored) throw new Error('COMPROMISE_DETECTED');

  if (stored.revokedAt) {
    // Two tabs can submit the same cookie at almost the same time. The first
    // request rotates it; the second then sees the revoked row. Treat only a
    // very recent rotation as a benign race, returning a retryable response
    // rather than revoking every session. Older revoked-token reuse remains
    // a compromise signal.
    const recentlyRotated = Date.now() - new Date(stored.revokedAt).getTime() <= 15_000;
    if (recentlyRotated) throw new Error('REFRESH_TOKEN_ALREADY_ROTATED');
    await prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw new Error('COMPROMISE_DETECTED');
  }

  if (new Date() > stored.expiresAt) {
    throw new Error('REFRESH_TOKEN_EXPIRED');
  }

  const daysSinceLastUse = (new Date() - new Date(stored.lastUsedAt)) / (1000 * 60 * 60 * 24);
  if (daysSinceLastUse > INACTIVITY_LIMIT_DAYS) {
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    throw new Error('INACTIVITY_WINDOW_EXPIRED');
  }

  // Load the user BEFORE rotating/revoking the current token. If this query
  // fails transiently after rotation, the server would have created a new
  // token but could not send its cookie, stranding the client with a revoked
  // token. A lookup failure here leaves the current token untouched.
  const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
  if (!user) throw new Error('ACCOUNT_NOT_FOUND');

  const tokens = await generateTokenPair(decoded.userId, presentedRefreshToken);
  return { ...tokens, userId: decoded.userId, user };
}