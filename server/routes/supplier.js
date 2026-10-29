import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { becomeSupplier, getMySupplierProfile, getMySupplierPools, getMyOrderRequests, sendPoolOffer, confirmSupplierPoolPayment, processSupplierRefund, fulfillSupplierPool } from '../controllers/supplierController.js';
import { getOverview, getUnassigned, acceptPoolOffer } from '../controllers/demandController.js';

const router = express.Router();

router.post('/register', requireAuth, becomeSupplier);
router.get('/me', requireAuth, getMySupplierProfile);
router.get('/pools', requireAuth, getMySupplierPools);
// Merchants quote on group orders; members never choose a merchant.
router.get('/offers/requests', requireAuth, getMyOrderRequests);
router.post('/offers/pools/:poolId', requireAuth, sendPoolOffer);
router.post('/pool-payments/:paymentId/confirm', requireAuth, confirmSupplierPoolPayment);
router.post('/pool-payments/:paymentId/refund', requireAuth, processSupplierRefund);
router.post('/pools/:poolId/fulfill', requireAuth, fulfillSupplierPool);

// Admin-only: real pooled demand across every category, and accepting the
// best merchant offer on a group order. Each handler checks admin itself.
router.get('/admin/demand-overview', requireAuth, getOverview);
router.get('/admin/unassigned-pools', requireAuth, getUnassigned);
router.post('/admin/offers/:offerId/accept', requireAuth, acceptPoolOffer);

export default router;
