import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  listMyGroups,
  listSuggestedGroups,
  createGroup,
  getGroup,
  joinSuggestedGroup,
  joinByCode,
  leaveGroup,
  removeMember,
  resetInviteLink,
} from '../controllers/clanGroupsController.js';

// Mounted under /api/iziduko/groups (see routes/iziduko.js).
const router = express.Router();

router.get('/', requireAuth, listMyGroups);
router.get('/suggested', requireAuth, listSuggestedGroups);
router.post('/', requireAuth, createGroup);
router.post('/join-by-code', requireAuth, joinByCode);
router.get('/:id', requireAuth, getGroup);
router.post('/:id/join', requireAuth, joinSuggestedGroup);
router.delete('/:id/leave', requireAuth, leaveGroup);
router.delete('/:id/members/:userId', requireAuth, removeMember);
router.post('/:id/invite-link', requireAuth, resetInviteLink);

export default router;
