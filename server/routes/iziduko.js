import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getMyClanMatches,
  connectWithMatch,
  respondToConnectionRequest,
  withdrawConnectionRequest,
  listConnectionRequests,
  listConnections,
  viewConnectionProfile,
} from '../controllers/izidukoController.js';
import { listRites, addRite, updateRite, deleteRite } from '../controllers/ancestralRitesController.js';

const router = express.Router();

router.get('/matches', requireAuth, getMyClanMatches);
router.post('/connect', requireAuth, connectWithMatch);
router.get('/requests', requireAuth, listConnectionRequests);
router.patch('/requests/:id', requireAuth, respondToConnectionRequest);
router.delete('/requests/:id', requireAuth, withdrawConnectionRequest);
router.get('/connections', requireAuth, listConnections);
router.get('/connections/:userId/profile', requireAuth, viewConnectionProfile);

// Shared family list of ancestral rites still to be done
router.get('/rites', requireAuth, listRites);
router.post('/rites', requireAuth, addRite);
router.patch('/rites/:id', requireAuth, updateRite);
router.delete('/rites/:id', requireAuth, deleteRite);

export default router;
