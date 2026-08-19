import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { addUkusokaEntry, getMyUkusokaEntries, deleteUkusokaEntry } from '../controllers/ukusokaController.js';

const router = express.Router();
router.post('/', requireAuth, addUkusokaEntry);
router.get('/my', requireAuth, getMyUkusokaEntries);
router.delete('/:entryId', requireAuth, deleteUkusokaEntry);

export default router;
