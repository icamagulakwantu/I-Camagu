import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listConversationsHandler, getConversationHandler, sendMessageHandler } from '../controllers/messageController.js';

const router = express.Router();

router.get('/', requireAuth, listConversationsHandler);
router.get('/:userId', requireAuth, getConversationHandler);
router.post('/:userId', requireAuth, sendMessageHandler);

export default router;
