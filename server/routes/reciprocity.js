import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { addReciprocityEntry, addReciprocityEntriesBatch, getMyReciprocityEntries, deleteReciprocityEntry } from '../controllers/reciprocityController.js';

const router = express.Router();

router.post('/batch', requireAuth, addReciprocityEntriesBatch);
router.post('/', requireAuth, addReciprocityEntry);
router.get('/my', requireAuth, getMyReciprocityEntries);
router.delete('/:entryId', requireAuth, deleteReciprocityEntry);

export default router;