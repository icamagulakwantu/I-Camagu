import prisma from '../config/db.js';
import crypto from 'crypto';
import resend from '../config/email.js';
import { createOtp, verifyOtp as checkOtp } from '../services/otpService.js';
import { generateTokenPair, rotateToken } from '../services/tokenService.js';
import { hashPassword, verifyPassword } from '../services/passwordService.js';
import { verifyGoogleToken } from '../services/googleAuthService.js';

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/api/auth',
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

function serializeUser(user) {
  return {
    id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName,
    paternalIziduko: user.paternalIziduko, maternalIziduko: user.maternalIziduko,
    paternalGrandmotherIziduko: user.paternalGrandmotherIziduko,
    maternalGrandmotherIziduko: user.maternalGrandmotherIziduko,
    username: user.username, profileImage: user.profileImage,
  };
}

export async function checkEmail(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    res.json({ exists: !!user, hasPassword: !!user?.passwordHash });
  } catch (error) {
  console.error('CHECK EMAIL ERROR:', error);
  res.status(500).json({
    error: 'Could not check email',
    details: error.message,
  });
}

// NEW: full registration with a real password, replacing the OTP-only flow as primary
export async function registerWithPassword(req, res) {
  const { email, password, firstName, lastName, paternalIziduko, maternalIziduko } = req.body;

  if (!email || !password || !firstName || !lastName || !paternalIziduko || !maternalIziduko) {
    return res.status(400).json({ error: 'All fields are required, including both Iziduko' });
  }
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'An account with this email already exists' });

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, passwordHash, firstName, lastName, paternalIziduko, maternalIziduko },
    });

    const { syncUserClanGroups } = await import('../services/izidukoService.js');
    await syncUserClanGroups(user);

    const { accessToken, refreshToken } = await generateTokenPair(user.id);
    res.cookie('jid', refreshToken, REFRESH_COOKIE_OPTIONS);
    res.status(201).json({ accessToken, user: serializeUser(user) });
  } catch (error) {
    console.error('Register with password error:', error.message);
    res.status(500).json({ error: 'Could not register' });
  }
}

// NEW: real password login
export async function loginWithPassword(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) return res.status(401).json({ error: 'Invalid email or password' });

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    const { accessToken, refreshToken } = await generateTokenPair(user.id);
    res.cookie('jid', refreshToken, REFRESH_COOKIE_OPTIONS);
    res.json({ accessToken, user: serializeUser(user) });
  } catch (error) {
    console.error('Login with password error:', error.message);
    res.status(500).json({ error: 'Could not log in' });
  }
}

// NEW: Google Sign-In
export async function googleAuth(req, res) {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ error: 'idToken is required' });

  try {
    const googleData = await verifyGoogleToken(idToken);

    let user = await prisma.user.findUnique({ where: { googleId: googleData.googleId } });
    if (!user) {
      user = await prisma.user.findUnique({ where: { email: googleData.email } });
      if (user) {
        user = await prisma.user.update({ where: { id: user.id }, data: { googleId: googleData.googleId } });
      } else {
        user = await prisma.user.create({
          data: {
            email: googleData.email, googleId: googleData.googleId,
            firstName: googleData.firstName, lastName: googleData.lastName,
          },
        });
      }
    }

    const { accessToken, refreshToken } = await generateTokenPair(user.id);
    res.cookie('jid', refreshToken, REFRESH_COOKIE_OPTIONS);
    res.json({ accessToken, user: serializeUser(user), needsIziduko: !user.paternalIziduko });
  } catch (error) {
    console.error('Google auth error:', error.message);
    res.status(401).json({ error: 'Could not verify Google sign-in' });
  }
}

// OTP flow — kept fully intact as a fallback, unchanged from before
export async function register(req, res) {
  const { email, firstName, lastName, paternalIziduko, maternalIziduko } = req.body;
  if (!email || !firstName || !lastName || !paternalIziduko || !maternalIziduko) {
    return res.status(400).json({ error: 'Email, first name, surname, and both Iziduko are required' });
  }
  try {
    const user = await prisma.user.upsert({
      where: { email }, update: {},
      create: { email, firstName, lastName, paternalIziduko, maternalIziduko },
    });
    const { syncUserClanGroups } = await import('../services/izidukoService.js');
    await syncUserClanGroups(user);

    const code = await createOtp(user.id);
    const { error: sendError } = await resend.emails.send({
      from: 'onboarding@resend.dev', to: email, subject: 'Your iCamagu login code',
      html: `<p>Your iCamagu verification code is:</p><h2>${code}</h2><p>Expires in 10 minutes.</p>`,
    });
    if (sendError) return res.status(422).json({ error: 'Could not send the code to this email.' });
    res.json({ message: 'OTP sent', userId: user.id });
  } catch (error) {
    console.error('Register error:', error.message);
    res.status(500).json({ error: 'Could not register' });
  }
}

export async function login(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'No account found with this email' });

    const code = await createOtp(user.id);
    const { error: sendError } = await resend.emails.send({
      from: 'onboarding@resend.dev', to: email, subject: 'Your iCamagu login code',
      html: `<p>Your iCamagu verification code is:</p><h2>${code}</h2><p>Expires in 10 minutes.</p>`,
    });
    if (sendError) return res.status(422).json({ error: 'Could not send the code.' });
    res.json({ message: 'OTP sent', userId: user.id });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ error: 'Could not log in' });
  }
}

export async function verifyOtp(req, res) {
  const { userId, code } = req.body;
  if (!userId || !code) return res.status(400).json({ error: 'userId and code are required' });
  try {
    const isValid = await checkOtp(userId, code);
    if (!isValid) return res.status(401).json({ error: 'Invalid or expired code' });

    const { accessToken, refreshToken } = await generateTokenPair(userId);
    res.cookie('jid', refreshToken, REFRESH_COOKIE_OPTIONS);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    res.json({ accessToken, user: serializeUser(user) });
  } catch (error) {
    console.error('Verify OTP error:', error.message);
    res.status(500).json({ error: 'Could not verify code' });
  }
}

export async function refresh(req, res) {
  const oldRefreshToken = req.cookies.jid;
  if (!oldRefreshToken) return res.status(401).json({ error: 'No refresh token provided' });
  try {
    const { accessToken, refreshToken, userId } = await rotateToken(oldRefreshToken);
    res.cookie('jid', refreshToken, REFRESH_COOKIE_OPTIONS);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    res.json({ accessToken, user: serializeUser(user) });
  } catch (error) {
    res.clearCookie('jid', { path: '/api/auth' });
    if (error.message === 'COMPROMISE_DETECTED') return res.status(401).json({ error: 'Session invalidated. Please log in again.' });
    return res.status(401).json({ error: 'Session expired. Please log in again.' });
  }
}

export async function logout(req, res) {
  res.clearCookie('jid', { path: '/api/auth' });
  res.json({ message: 'Logged out' });
}

export async function requestPasswordReset(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      return res.json({ message: 'If an account exists with this email, a reset link has been sent.' });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordResetTokenHash: tokenHash, passwordResetExpiresAt: expiresAt },
    });

    const resetUrl = `${req.protocol}://${req.get('host')}/reset-password/${rawToken}`;
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: email,
      subject: 'Reset your iCamagu password',
      html: `<p>Someone requested a password reset for your iCamagu account.</p>
             <p><a href="${resetUrl}">Click here to reset your password</a> — this link expires in 30 minutes.</p>
             <p>If you didn't request this, you can safely ignore this email.</p>`,
    });

    res.json({ message: 'If an account exists with this email, a reset link has been sent.' });
  } catch (error) {
    console.error('Request password reset error:', error.message);
    res.status(500).json({ error: 'Could not process request' });
  }
}

export async function resetPassword(req, res) {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: 'token and newPassword are required' });
  if (newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await prisma.user.findFirst({
      where: { passwordResetTokenHash: tokenHash, passwordResetExpiresAt: { gt: new Date() } },
    });
    if (!user) return res.status(400).json({ error: 'This reset link is invalid or has expired' });

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, passwordResetTokenHash: null, passwordResetExpiresAt: null },
    });
    await prisma.refreshToken.updateMany({ where: { userId: user.id }, data: { revokedAt: new Date() } });

    res.json({ message: 'Password reset successfully. Please log in with your new password.' });
  } catch (error) {
    console.error('Reset password error:', error.message);
    res.status(500).json({ error: 'Could not reset password' });
  }
}
