import express from 'express';
import { rateLimit } from '../middleware/rateLimiter.js';
import {
  register, login, checkEmail, verifyOtp, refresh, logout,
  registerWithPassword, loginWithPassword, googleAuth,
  requestPasswordReset, resetPassword,
} from '../controllers/authController.js';

const router = express.Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
const strictLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });

router.post('/check-email', authLimiter, checkEmail);
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/verify-otp', strictLimiter, verifyOtp);
router.post('/register-password', authLimiter, registerWithPassword);
router.post('/login-password', strictLimiter, loginWithPassword);
router.post('/google', authLimiter, googleAuth);
router.post('/forgot-password', strictLimiter, requestPasswordReset);
router.post('/reset-password', strictLimiter, resetPassword);
router.post('/refresh', refresh);
router.post('/logout', logout);

export default router;
