import express from 'express';
import { getPublicPlan } from '../controllers/ceremonyController.js';
import { getPublicPlanPledges } from '../controllers/publicPledgeController.js';
import { addPledgeViaLink } from '../controllers/pledgeLinkController.js';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimiter.js';

const router = express.Router();
router.get('/plan/:token', getPublicPlan);
router.get('/plan/:token/pledges', getPublicPlanPledges);
// Signed-in people only: a link opener must register before their pledge is saved.
router.post(
  '/plan/:token/pledge',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }),
  requireAuth,
  addPledgeViaLink
);

export default router;
