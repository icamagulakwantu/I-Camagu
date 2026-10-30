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
import { matchIsidukoName, searchClanDirectory, submitIsidukoReview } from '../controllers/izidukoController.js';
import clanGroupRoutes from './clanGroups.js';

const router = express.Router();

router.get('/match', requireAuth, matchIsidukoName);
// Search bar on "Find your clan": clans by clan name or praise name
router.get('/clans', requireAuth, searchClanDirectory);
router.post('/submissions', requireAuth, submitIsidukoReview);
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

// Clan groups (start one, join with a link, bring a WhatsApp group over)
router.use('/groups', clanGroupRoutes);

export default router;
