import express from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimiter.js';
import {
  createStokvel,
  joinStokvel,
  leaveStokvel,
  getMyStokvels,
  getStokvel,
  getStokvelsById,
  deleteStokvel,
  getPendingApprovalCount,
  toggleBereavementProtocol,
  updateStokvel,
  setRotationOrder
} from '../controllers/stokvelController.js';
import { listOfficials, setOfficial, removeOfficial } from '../controllers/stokvelOfficialsController.js';
import {
  submitContribution,
  confirmContribution,
  getPendingContributions,
  recordInterest,
  recordGroupExpense,
} from '../controllers/contributionController.js';
import { postAnnouncement, getAnnouncements } from '../controllers/announcementController.js';
import {
  listMinutes, createMinutes, listFines, issueFine, payFine,
  getConstitution, saveConstitution, getAuditLog,
} from '../controllers/stokvelRecordsController.js';
import {
  listLoans, requestLoan, voteLoan, repayLoan,
  listTradeCredit, createTradeCredit, updateTradeCredit, getStatement,
} from '../controllers/stokvelFinanceController.js';
import { listLendingTargets, setLendingTarget, recordLendingRound } from '../controllers/stokvelLendingController.js';
import { getLedger, verifyLedgerChain } from '../controllers/ledgerController.js';
import {
  requestPayout,
  approvePayout,
  getShrineFundTotal,
  donateToShrineFund,
  recordShrineAllocation
} from '../controllers/payoutController.js';

const router = express.Router();

router.post('/', requireAuth, createStokvel);
router.post('/join', requireAuth, joinStokvel);
router.post('/interest/record', requireAuth, recordInterest);
router.post('/expense/record', requireAuth, recordGroupExpense);
router.get('/pending-approvals/count', requireAuth, getPendingApprovalCount);
router.get('/my', requireAuth, getMyStokvels);
router.get('/shrine-fund/total', optionalAuth, getShrineFundTotal);
router.post(
  '/shrine-fund/donate',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 5 }),
  optionalAuth,
  donateToShrineFund
);
router.post('/shrine-fund/allocate', requireAuth, recordShrineAllocation);
router.get('/:stokvelId', requireAuth, getStokvel);
router.patch('/:stokvelId', requireAuth, updateStokvel);
router.patch('/:stokvelId/rotation-order', requireAuth, setRotationOrder);
router.get('/id/:stokvelId', requireAuth, getStokvelsById);
router.post('/bereavement/toggle', requireAuth, toggleBereavementProtocol);
router.post('/announcements', requireAuth, postAnnouncement);
router.get('/:stokvelId/announcements', requireAuth, getAnnouncements);
router.get('/:stokvelId/officials', requireAuth, listOfficials);
router.put('/:stokvelId/officials', requireAuth, setOfficial);
router.delete('/:stokvelId/officials/:memberUserId', requireAuth, removeOfficial);
router.get('/:stokvelId/minutes', requireAuth, listMinutes);
router.post('/:stokvelId/minutes', requireAuth, createMinutes);
router.get('/:stokvelId/fines', requireAuth, listFines);
router.post('/:stokvelId/fines', requireAuth, issueFine);
router.post('/:stokvelId/fines/:fineId/pay', requireAuth, payFine);
router.get('/:stokvelId/constitution', requireAuth, getConstitution);
router.post('/:stokvelId/constitution', requireAuth, saveConstitution);
router.put('/:stokvelId/constitution', requireAuth, saveConstitution);
router.get('/:stokvelId/audit', requireAuth, getAuditLog);
router.get('/:stokvelId/ledger', requireAuth, getLedger);
router.get('/:stokvelId/ledger/verify', requireAuth, verifyLedgerChain);
router.get('/:stokvelId/loans', requireAuth, listLoans);
router.post('/:stokvelId/loans', requireAuth, requestLoan);
router.post('/:stokvelId/loans/:loanId/vote', requireAuth, voteLoan);
router.post('/:stokvelId/loans/:loanId/repay', requireAuth, repayLoan);
router.get('/:stokvelId/lending', requireAuth, listLendingTargets);
router.put('/:stokvelId/lending/target', requireAuth, setLendingTarget);
router.post('/:stokvelId/lending/rounds', requireAuth, recordLendingRound);
router.get('/:stokvelId/trade-credit', requireAuth, listTradeCredit);
router.post('/:stokvelId/trade-credit', requireAuth, createTradeCredit);
router.patch('/:stokvelId/trade-credit/:creditId', requireAuth, updateTradeCredit);
router.get('/:stokvelId/statement', requireAuth, getStatement);

const pinLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });

router.post('/contributions/submit', requireAuth, submitContribution);
router.post('/contributions/confirm', requireAuth, pinLimiter, confirmContribution);
router.get('/:stokvelId/contributions/pending', requireAuth, getPendingContributions);

router.post('/payouts/request', requireAuth, requestPayout);
router.delete('/:stokvelId', requireAuth, deleteStokvel);
router.delete('/:stokvelId/leave', requireAuth, leaveStokvel);
router.post('/payouts/approve', requireAuth, pinLimiter, approvePayout);

export default router;
