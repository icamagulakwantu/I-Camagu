import express from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimiter.js';
import {
  createStokvel,
  joinStokvel,
  getMyStokvels,
  getStokvel,
  getStokvelsById,
  deleteStokvel,
  getPendingApprovalCount,
  toggleBereavementProtocol,
  updateStokvel,
  setRotationOrder
} from '../controllers/stokvelController.js';
import {
  submitContribution,
  confirmContribution,
  getPendingContributions,
  recordInterest,
  recordGroupExpense,
} from '../controllers/contributionController.js';
import { postAnnouncement, getAnnouncements } from '../controllers/announcementController.js';
import {
  requestPayout,
  approvePayout,
  getShrineFundTotal,
  donateToShrineFund,
  recordShrineAllocation
} from '../controllers/payoutController.js';

const router = express.Router();

router.post('/', requireAuth, createStokvel);
router.post('/join', requireAuth, joinStokvel);
router.post('/interest/record', requireAuth, recordInterest);
router.post('/expense/record', requireAuth, recordGroupExpense);
router.get('/pending-approvals/count', requireAuth, getPendingApprovalCount);
router.get('/my', requireAuth, getMyStokvels);
// Ubuhlanti bakwa Xhosa is a public fund: anyone may see what it has raised
// and pledge a donation, with or without an iCamagu account. Rate-limited
// because it's unauthenticated and writes a row + sends an admin email.
router.get('/shrine-fund/total', optionalAuth, getShrineFundTotal);
router.post(
  '/shrine-fund/donate',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 5 }),
  optionalAuth,
  donateToShrineFund
);
// Admin-only: record money committed out of the fund to a real project.
router.post('/shrine-fund/allocate', requireAuth, recordShrineAllocation);
router.get('/:stokvelId', requireAuth, getStokvel);
router.patch('/:stokvelId', requireAuth, updateStokvel);
router.patch('/:stokvelId/rotation-order', requireAuth, setRotationOrder);
router.get('/id/:stokvelId', requireAuth, getStokvelsById);
router.post('/bereavement/toggle', requireAuth, toggleBereavementProtocol);
router.post('/announcements', requireAuth, postAnnouncement);
router.get('/:stokvelId/announcements', requireAuth, getAnnouncements);

// Both of these check a PIN (see pinService.verifyPin) before releasing real
// money — a 4-6 digit PIN is only up to a million combinations, so without a
// limiter here a stolen access token would be enough to brute-force it in a
// tight loop. Same strict budget already used for password/OTP attempts.
const pinLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });

router.post('/contributions/submit', requireAuth, submitContribution);
router.post('/contributions/confirm', requireAuth, pinLimiter, confirmContribution);
router.get('/:stokvelId/contributions/pending', requireAuth, getPendingContributions);

router.post('/payouts/request', requireAuth, requestPayout);
router.delete('/:stokvelId', requireAuth, deleteStokvel);
router.post('/payouts/approve', requireAuth, pinLimiter, approvePayout);

export default router;
