import express from 'express';
import { getCeremonyExample } from '../controllers/examplesController.js';
import { exampleList } from '../services/exampleAccess.js';

// Worked examples, open to everyone (no account needed): marked "Example".
const router = express.Router();
router.get('/ceremony', getCeremonyExample);
// The live examples: real stokvels and a real ceremony anyone can open.
router.get('/live', (req, res) => res.json(exampleList()));

export default router;
