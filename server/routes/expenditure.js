import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { addExpenditureEntry, getMyExpenditures } from '../controllers/expenditureController.js';

const router = express.Router();
router.post('/', requireAuth, addExpenditureEntry);
router.get('/my', requireAuth, getMyExpenditures);

export default router;
