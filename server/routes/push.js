import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getPushKey, subscribe, unsubscribe } from '../controllers/pushController.js';

const router = express.Router();
router.get('/key', getPushKey);
router.post('/subscribe', requireAuth, subscribe);
router.post('/unsubscribe', requireAuth, unsubscribe);

export default router;
