import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getMyClanMatches } from '../controllers/izidukoController.js';

const router = express.Router();

router.get('/matches', requireAuth, getMyClanMatches);

export default router;