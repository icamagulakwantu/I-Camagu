import express from 'express';
import { getPublicPlan } from '../controllers/ceremonyController.js';
import { getPublicPlanPledges } from '../controllers/publicPledgeController.js';

const router = express.Router();
router.get('/plan/:token', getPublicPlan);
router.get('/plan/:token/pledges', getPublicPlanPledges);

export default router;
