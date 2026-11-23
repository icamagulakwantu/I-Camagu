import express from 'express';
import { getCeremonyExample } from '../controllers/examplesController.js';

// Worked examples, open to everyone (no account needed): marked "Example".
const router = express.Router();
router.get('/ceremony', getCeremonyExample);

export default router;
