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
      await tx.refreshToken.updateMany({
        where: { tokenHash: oldHash },
        data: { revokedAt: new Date() },
      });
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

  if (!stored || stored.revokedAt) {
    if (stored) {
      await prisma.refreshToken.updateMany({
        where: { userId: stored.userId },
        data: { revokedAt: new Date() },
      });
    }
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