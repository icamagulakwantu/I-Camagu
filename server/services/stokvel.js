import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { 
  createStokvel, 
  joinStokvel, 
  getMyStokvels, 
  getStokvel, 
  getStokvelsById,
  deleteStokvel,
  getPendingApprovalCount, 
  recordInterest,
  toggleBereavementProtocol 
} from '../controllers/stokvelController.js';
import { 
  submitContribution, 
  confirmContribution, 
  getPendingContributions 
} from '../controllers/contributionController.js';
import { postAnnouncement, getAnnouncements } from '../controllers/announcementController.js';
import { 
  requestPayout, 
  approvePayout 
} from '../controllers/payoutController.js';

const router = express.Router();

router.post('/', requireAuth, createStokvel);
router.post('/join', requireAuth, joinStokvel);
router.post('/interest/record', requireAuth, recordInterest);
router.get('/pending-approvals/count', requireAuth, getPendingApprovalCount);
router.get('/my', requireAuth, getMyStokvels);
router.get('/:stokvelId', requireAuth, getStokvel);
router.get('/id/:stokvelId', requireAuth, getStokvelsById);
router.post('/bereavement/toggle', requireAuth, toggleBereavementProtocol);
router.post('/announcements', requireAuth, postAnnouncement);
router.get('/:stokvelId/announcements', requireAuth, getAnnouncements);

router.post('/contributions/submit', requireAuth, submitContribution);
router.post('/contributions/confirm', requireAuth, confirmContribution);
router.get('/:stokvelId/contributions/pending', requireAuth, getPendingContributions);

router.post('/payouts/request', requireAuth, requestPayout);
router.delete('/:stokvelId', requireAuth, deleteStokvel);
router.post('/payouts/approve', requireAuth, approvePayout);

export default router;
