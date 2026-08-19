import express from 'express';
import { getFeaturedLegend, getAllLegends, verifyLegendEntry } from '../controllers/legendController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.get('/featured', getFeaturedLegend);
router.get('/', getAllLegends);
router.patch('/verify', requireAuth, verifyLegendEntry);

export default router;
