import prisma from '../config/db.js';
import crypto from 'crypto';
import resend, { FROM_ADDRESS } from '../config/email.js';
import { createOtp, verifyOtp as checkOtp } from '../services/otpService.js';
import { generateTokenPair, rotateToken } from '../services/tokenService.js';
import { hashPassword, verifyPassword } from '../services/passwordService.js';
import { verifyGoogleToken } from '../services/googleAuthService.js';
import { isAdminEmail } from '../config/admin.js';

// Render does not set NODE_ENV for Node services unless you add it yourself,
// so keying `secure` off NODE_ENV alone silently ships the refresh cookie
// without the Secure flag in production. RENDER is set by the platform on
// every Render instance, so treat either signal as "we are deployed".
const IS_DEPLOYED = process.env.NODE_ENV === 'production' || !!process.env.RENDER;

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: IS_DEPLOYED,
  sameSite: 'strict',
  path: '/api/auth',
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

// SEC-02: sign-in must not tell a stranger whether an email has an account.
// Every "send me a code" request gets this same reply, whether or not a code
// was actually sent.
export const OTP_SENT_MESSAGE = 'If an iCamagu account uses this email, we have sent it a 6-digit login code.';

function serializeUser(user) {
  return {
    id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName,
    paternalIziduko: user.paternalIziduko, maternalIziduko: user.maternalIziduko,
    paternalGrandmotherIziduko: user.paternalGrandmotherIziduko,
    maternalGrandmotherIziduko: user.maternalGrandmotherIziduko,
    nationLabel: user.nationLabel, clanGroupId: user.clanGroupId,
    username: user.username, profileImage: user.profileImage,
    address: user.address, age: user.age, phoneNumber: user.phoneNumber,
    location: user.location, latitude: user.latitude, longitude: user.longitude,
    // Real backend routes (identityController, marginController,
    // quoteController's admin endpoints, etc.) already 403 a non-admin via
    // isAdminEmail — this just lets the frontend hide the menu items that
    // lead nowhere for everyone else, instead of shipping the admin email
    // list itself to the client.
    isAdmin: isAdminEmail(user.email),
  };
}

const otpEmail = (code) =>
  `<p>Your iCamagu verification code is:</p><h2>${code}</h2><p>Expires in 10 minutes. Never share this code with anyone.</p>`;

const cleanEmail = (value) => (typeof value === 'string' ? value.trim() : '');

// Sends an email without making the caller wait for it. Waiting would make
// "account exists" replies measurably slower than "no account" replies, and
// a failed send must not change the reply either. Failures are logged.
function sendQuietly(message, label) {
  Promise.resolve()
    .then(() => resend.emails.send(message))
    .then((result) => {
      if (result?.error) console.error(`${label} email failed:`, result.error.message);
    })
    .catch((error) => console.error(`${label} email failed:`, error?.message));
}

// A real bcrypt hash of a random password, so a sign-in attempt for an email
// with no account does the same slow check as one with an account.
let dummyHashPromise = null;
function dummyHash() {
  if (!dummyHashPromise) dummyHashPromise = hashPassword(crypto.randomBytes(16).toString('hex'));
  return dummyHashPromise;
}

// Retired (SEC-02): this used to answer "does this email have an account,
// and does it have a password?" to anyone who asked. The sign-in screen no
// longer calls it. Kept only so a browser tab still showing the old screen
// gets a clear message instead of a broken page.
export async function checkEmail(req, res) {
  res.status(410).json({ error: 'The sign-in screen has been updated. Please refresh the page and try again.' });
}

// NEW: full registration with a real password, replacing the OTP-only flow as primary
export async function registerWithPassword(req, res) {
  // Iziduko is collected as a post-signup follow-up now (same step the
  // Google sign-in path already uses), not upfront during registration —
  // asking for clan names before someone understands why iCamagu wants
  // them just adds friction to account creation. Still accepted here if a
  // caller does send it (kept optional, not removed) so nothing breaks for
  // an existing client sending the old shape.
  const { email, password, firstName, lastName, paternalIziduko, maternalIziduko } = req.body;

  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({ error: 'Email, password, first name and surname are required' });
  }
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  // Resend's shared onboarding sender can only deliver to the Resend account
  // owner. Fail closed instead of creating an account whose verification code
  // the real member cannot receive. Google sign-in remains available.
  if (String(FROM_ADDRESS).toLowerCase().includes('onboarding@resend.dev')) {
    return res.status(503).json({ error: 'Password registration is temporarily unavailable until iCamagu email delivery is configured. Please use verified Google sign-in for now.' });
  }

  // Admin identities must be established through the verified Google sign-in
  // path, not by claiming a hard-coded administrator email during password
  // registration. This closes the new-account takeover path while the full
  // email-verification flow is implemented.
  if (isAdminEmail(cleanEmail(email).toLowerCase())) {
    return res.status(403).json({ error: 'Administrator accounts must use verified Google sign-in. Contact support if you need access restored.' });
  }

  try {
    // Still reveals that an account exists (SEC-02 residual): fixing that needs
    // an email-confirmation step on sign-up. Rate limited by authLimiter.
    const existing = await prisma.user.findUnique({ where: { email: cleanEmail(email).toLowerCase() } });
    if (existing) {
      // Keep registration from revealing whether an email is registered. A
      // code is sent to the owner of that address; entering it follows the
      // normal OTP login path and never changes the existing password.
      const code = await createOtp(existing.id);
      sendQuietly({ from: FROM_ADDRESS, to: existing.email, subject: 'Your iCamagu login code', html: otpEmail(code) }, 'Registration existing-account code');
      return res.status(201).json({ needsEmailVerification: true, message: 'If you can use this email, check your inbox for a code to continue.' });
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email: cleanEmail(email).toLowerCase(), passwordHash, firstName, lastName, paternalIziduko: paternalIziduko || null, maternalIziduko: maternalIziduko || null, emailVerificationRequired: true },
    });

    const { syncUserClanGroups } = await import('../services/izidukoService.js');
    await syncUserClanGroups(user);

    const code = await createOtp(user.id);
    sendQuietly({
      from: FROM_ADDRESS,
      to: user.email,
      subject: 'Verify your iCamagu email',
      html: `<p>Welcome to iCamagu.</p><p>Enter this 6-digit code to verify your email and finish creating your account:</p><h2>${code}</h2><p>The code expires in 10 minutes. If you did not create this account, ignore this email.</p>`,
    }, 'Registration verification');
    // Do not issue a session until the person proves they control the email.
    res.status(201).json({ needsEmailVerification: true, message: 'Check your email for a verification code.' });
  } catch (error) {
    console.error('Register with password error:', error.message);
    res.status(500).json({ error: 'Could not register' });
  }
}

// NEW: real password login
export async function loginWithPassword(req, res) {
  const { password } = req.body;
  const email = cleanEmail(req.body?.email).toLowerCase();
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      // Same slow check as a real account, so the reply time gives nothing away.
      await verifyPassword(password, await dummyHash());
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });
    if (isAdminEmail(email)) return res.status(403).json({ error: 'Administrator accounts must use verified Google sign-in.' });
    if (user.emailVerificationRequired) return res.status(403).json({ error: 'Verify your email first using the 6-digit code we sent when you registered.' });

    const { accessToken, refreshToken } = await generateTokenPair(user.id);
    res.cookie('jid', refreshToken, REFRESH_COOKIE_OPTIONS);
    res.json({ accessToken, user: serializeUser(user) });
  } catch (error) {
    console.error('Login with password error:', error.message);
    res.status(500).json({ error: 'Could not log in' });
  }
}

// Google Sign-In. Google must confirm the person owns the email, and an
// existing account is never taken over silently: if it already has a
// password or a different Google account, the person signs in the usual way.
// (The ACCOUNT_EXISTS reply is fine for SEC-02: only someone Google has
// confirmed owns this email can see it.)
export async function googleAuth(req, res) {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ error: 'idToken is required' });

  let googleData;
  try {
    googleData = await verifyGoogleToken(idToken);
  } catch (error) {
    console.error('Google auth error:', error.message);
    return res.status(401).json({ error: 'Could not verify Google sign-in' });
  }

  if (!googleData.email || !googleData.emailVerified) {
    return res.status(401).json({ error: 'Google has not confirmed this email address. Sign in with your email instead.' });
  }

  try {
    let user = await prisma.user.findUnique({ where: { googleId: googleData.googleId } });
    if (!user) {
      const existing = await prisma.user.findUnique({ where: { email: googleData.email } });
      if (existing) {
        if (isAdminEmail(existing.email) && (!existing.googleId || existing.googleId === googleData.googleId)) {
          // A verified Google assertion is the required proof for administrator
          // identities. It can safely recover a legacy password-only admin
          // account without trusting the password that originally claimed it.
          user = await prisma.user.update({
            where: { id: existing.id },
            data: {
              googleId: googleData.googleId,
              passwordHash: null,
              emailVerificationRequired: false,
              passwordResetTokenHash: null,
              passwordResetExpiresAt: null,
            },
          });
        } else {
          if (existing.passwordHash || (existing.googleId && existing.googleId !== googleData.googleId)) {
            return res.status(409).json({
              error: 'An iCamagu account already uses this email. Sign in with its existing sign-in method.',
              code: 'ACCOUNT_EXISTS',
            });
          }
          // Account made with email codes only: Google has proved the person owns this email.
          user = await prisma.user.update({ where: { id: existing.id }, data: { googleId: googleData.googleId, emailVerificationRequired: false } });
        }
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
    res.status(500).json({ error: 'Could not sign in with Google' });
  }
}

// OTP flow — kept as a fallback. The screen does not use this endpoint, but
// it no longer hands back an internal user id.
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
    sendQuietly({ from: FROM_ADDRESS, to: email, subject: 'Your iCamagu login code', html: otpEmail(code) }, 'Register code');
    res.json({ message: OTP_SENT_MESSAGE });
  } catch (error) {
    console.error('Register error:', error.message);
    res.status(500).json({ error: 'Could not register' });
  }
}

// "Email me a login code". Same reply whether or not the email has an account.
export async function login(req, res) {
  const email = cleanEmail(req.body?.email).toLowerCase();
  if (!email) return res.status(400).json({ error: 'Email is required' });
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const code = await createOtp(user.id);
      sendQuietly({ from: FROM_ADDRESS, to: email, subject: 'Your iCamagu login code', html: otpEmail(code) }, 'Login code');
    }
    res.json({ message: OTP_SENT_MESSAGE });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ error: 'Could not send a code. Please try again.' });
  }
}

// Checks a login code, by email (not by internal user id). Wrong guesses for
// an email with no account are counted exactly like real ones, under a
// stand-in key, so the replies ("N tries left", then the lock) are the same.
export async function verifyOtp(req, res) {
  const email = cleanEmail(req.body?.email).toLowerCase();
  const code = req.body?.code;
  if (!email || !code) return res.status(400).json({ error: 'Email and code are required' });
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    const attemptKey = user ? user.id : `no-account:${email.toLowerCase()}`;
    const result = await checkOtp(attemptKey, code);
    if (!user || !result.ok) {
      if (result.locked) {
        return res.status(429).json({ error: 'Too many wrong codes. Wait 15 minutes, then ask for a new code.' });
      }
      const left = result.attemptsLeft ? ` You have ${result.attemptsLeft} tries left.` : '';
      return res.status(401).json({ error: `Wrong or expired code.${left}` });
    }

    const verifiedUser = user.emailVerificationRequired
      ? await prisma.user.update({ where: { id: user.id }, data: { emailVerificationRequired: false } })
      : user;
    const { accessToken, refreshToken } = await generateTokenPair(verifiedUser.id);
    res.cookie('jid', refreshToken, REFRESH_COOKIE_OPTIONS);
    res.json({ accessToken, user: serializeUser(verifiedUser) });
  } catch (error) {
    console.error('Verify OTP error:', error.message);
    res.status(500).json({ error: 'Could not verify code' });
  }
}

export async function refresh(req, res) {
  const oldRefreshToken = req.cookies.jid;
  if (!oldRefreshToken) return res.status(401).json({ error: 'No refresh token provided' });
  try {
    const { accessToken, refreshToken, user } = await rotateToken(oldRefreshToken);
    res.cookie('jid', refreshToken, REFRESH_COOKIE_OPTIONS);
    res.json({ accessToken, user: serializeUser(user) });
  } catch (error) {
    // Only invalidate the cookie when the token is known to be invalid or
    // expired. A temporary database/outage error must not destroy a valid
    // refresh session or force a signed-in member to log in again.
    const invalidToken =
      error.message === 'COMPROMISE_DETECTED' ||
      error.message === 'REFRESH_TOKEN_EXPIRED' ||
      error.message === 'INACTIVITY_WINDOW_EXPIRED' ||
      error.message === 'ACCOUNT_NOT_FOUND' ||
      error.name === 'JsonWebTokenError' ||
      error.name === 'TokenExpiredError' ||
      error.name === 'NotBeforeError';

    if (invalidToken) {
      res.clearCookie('jid', { path: '/api/auth' });
      if (error.message === 'COMPROMISE_DETECTED') {
        return res.status(401).json({ error: 'Session invalidated. Please log in again.' });
      }
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }

    console.error('Refresh session temporarily failed:', error.message);
    return res.status(503).json({ error: 'Session refresh is temporarily unavailable. Please try again.' });
  }
}

export async function logout(req, res) {
  const refreshToken = req.cookies?.jid;

  // Revoke the server-side refresh token as well as clearing the browser
  // cookie. Clearing only the cookie leaves a copied token usable until it
  // expires or rotates.
  try {
    if (refreshToken) {
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await prisma.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    res.clearCookie('jid', { path: '/api/auth' });
    return res.json({ message: 'Logged out' });
  } catch (error) {
    console.error('Logout token revocation failed:', error.message);
    // Clear the local cookie even if the database is temporarily unavailable.
    res.clearCookie('jid', { path: '/api/auth' });
    return res.status(503).json({ error: 'Signed out on this device, but server-side session revocation could not be confirmed. Please retry.' });
  }
}

export async function requestPasswordReset(req, res) {
  const email = cleanEmail(req.body?.email).toLowerCase();
  if (!email) return res.status(400).json({ error: 'Email is required' });
  const genericReply = { message: 'If an account exists with this email, a reset link has been sent.' };

  // Never build password-reset links from Host / X-Forwarded-Host: those
  // headers are request-controlled and can poison a legitimate reset email.
  // APP_URL must be configured to the public HTTPS origin on the deployment.
  let publicAppUrl;
  try {
    const configuredUrl = new URL(process.env.APP_URL || '');
    if (configuredUrl.protocol !== 'https:' || configuredUrl.username || configuredUrl.password) {
      return res.json(genericReply);
    }
    publicAppUrl = configuredUrl.origin;
  } catch {
    console.error('Password reset email skipped: APP_URL must be a valid public HTTPS URL.');
    return res.json(genericReply);
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) return res.json(genericReply);

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordResetTokenHash: tokenHash, passwordResetExpiresAt: expiresAt },
    });

    const resetUrl = `${publicAppUrl}/reset-password/${rawToken}`;
    sendQuietly({
      from: FROM_ADDRESS,
      to: email,
      subject: 'Reset your iCamagu password',
      html: `<p>Someone requested a password reset for your iCamagu account.</p>
             <p><a href="${resetUrl}">Click here to reset your password</a> — this link expires in 30 minutes.</p>
             <p>If you didn't request this, you can safely ignore this email.</p>`,
    }, 'Password reset');

    res.json(genericReply);
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
