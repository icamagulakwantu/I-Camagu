import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getMyActivity } from '../controllers/activityController.js';

const router = express.Router();
router.get('/my', requireAuth, getMyActivity);

export default router;