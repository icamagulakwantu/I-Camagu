import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  submitIdentityVerification,
  getMyIdentityStatus,
  listPendingIdentityVerifications,
  reviewIdentityVerification,
} from '../controllers/identityController.js';

const router = express.Router();

router.post('/submit', requireAuth, submitIdentityVerification);
router.get('/my-status', requireAuth, getMyIdentityStatus);
router.get('/pending', requireAuth, listPendingIdentityVerifications);
router.post('/review', requireAuth, reviewIdentityVerification);

export default router;
