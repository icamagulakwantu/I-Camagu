import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimiter.js';
import { exportMyData, deleteMyAccount } from '../controllers/accountController.js';

const router = express.Router();
router.get('/export', requireAuth, exportMyData);
// Checks a password (see verifyPassword below) — same strict budget as
// every other password-check endpoint in the app (login, reset).
router.post('/delete', requireAuth, rateLimit({ windowMs: 15 * 60 * 1000, max: 5 }), deleteMyAccount);

export default router;
