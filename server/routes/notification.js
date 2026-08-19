import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getMyNotifications, getUnreadCount, markAsRead, markAllRead } from '../controllers/notificationController.js';

const router = express.Router();
router.get('/my', requireAuth, getMyNotifications);
router.get('/unread-count', requireAuth, getUnreadCount);
router.patch('/:notificationId/read', requireAuth, markAsRead);
router.patch('/read-all', requireAuth, markAllRead);

export default router;
