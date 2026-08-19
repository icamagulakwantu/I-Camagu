import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createPortal, getMyPortals, addMedia, softDeleteMedia, softDeletePortal } from '../controllers/portalController.js';

const router = express.Router();
router.post('/', requireAuth, createPortal);
router.get('/my', requireAuth, getMyPortals);
router.post('/media', requireAuth, addMedia);
router.patch('/media/:mediaId/delete', requireAuth, softDeleteMedia);
router.delete('/:portalId', requireAuth, softDeletePortal);

export default router;