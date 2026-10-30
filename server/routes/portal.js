import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  createPortal,
  getMyPortals,
  requestMediaUpload,
  confirmMediaUpload,
  addMedia,
  softDeleteMedia,
  softDeletePortal,
} from '../controllers/portalController.js';

const router = express.Router();
router.post('/', requireAuth, createPortal);
router.get('/my', requireAuth, getMyPortals);
// Direct-to-storage uploads: get a one-time link, then confirm when done.
router.post('/media/upload-url', requireAuth, requestMediaUpload);
router.post('/media/confirm', requireAuth, confirmMediaUpload);
// Fallback: file sent through the server (small photos only).
router.post('/media', requireAuth, addMedia);
router.patch('/media/:mediaId/delete', requireAuth, softDeleteMedia);
router.delete('/:portalId', requireAuth, softDeletePortal);

export default router;
