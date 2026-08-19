import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getAlcoholSummary } from '../controllers/hierarchyController.js';
import { generateDefaultGroups, setGroupAllocation, getCeremonyGroups } from '../controllers/hierarchyController.js';

const router = express.Router();
router.post('/generate', requireAuth, generateDefaultGroups);
router.post('/allocations', requireAuth, setGroupAllocation);
router.get('/:ceremonyId/alcohol-summary', requireAuth, getAlcoholSummary);
router.get('/:ceremonyId', requireAuth, getCeremonyGroups);

export default router;