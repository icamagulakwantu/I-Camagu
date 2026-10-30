import express from 'express';
import { getPublicPlan } from '../controllers/ceremonyController.js';
import { getPublicPlanPledges, addPublicPlanPledge } from '../controllers/publicPledgeController.js';
import { rateLimit } from '../middleware/rateLimiter.js';

const router = express.Router();
router.get('/plan/:token', getPublicPlan);
router.get('/plan/:token/pledges', getPublicPlanPledges);
// Anyone with the link can pledge, so cap it per device: 20 an hour.
router.post('/plan/:token/pledges', rateLimit({ windowMs: 60 * 60 * 1000, max: 20 }), addPublicPlanPledge);

export default router;
