import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  addGroup, generateDefaultGroups, getAlcoholSummary, getCeremonyGroups, moveGroup, removeGroup, setGroupAllocation, updateGroup,
} from '../controllers/hierarchyController.js';

// Seating and groups: who sits where, and who brings what.
const router = express.Router();
router.post('/generate', requireAuth, generateDefaultGroups);
router.post('/groups', requireAuth, addGroup);
router.patch('/groups/:groupId', requireAuth, updateGroup);
router.post('/groups/:groupId/move', requireAuth, moveGroup);
router.delete('/groups/:groupId', requireAuth, removeGroup);
router.post('/allocations', requireAuth, setGroupAllocation);
router.get('/:ceremonyId/alcohol-summary', requireAuth, getAlcoholSummary);
router.get('/:ceremonyId', requireAuth, getCeremonyGroups);

export default router;
