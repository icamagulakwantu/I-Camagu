import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { becomeSupplier, getMySupplierProfile, getMySupplierPools, confirmSupplierPoolPayment, processSupplierRefund, fulfillSupplierPool } from '../controllers/supplierController.js';
import { getOverview, getUnassigned, getPartnersList, assignPartner } from '../controllers/demandController.js';

const router = express.Router();

router.post('/register', requireAuth, becomeSupplier);
router.get('/me', requireAuth, getMySupplierProfile);
router.get('/pools', requireAuth, getMySupplierPools);
router.post('/pool-payments/:paymentId/confirm', requireAuth, confirmSupplierPoolPayment);
router.post('/pool-payments/:paymentId/refund', requireAuth, processSupplierRefund);
router.post('/pools/:poolId/fulfill', requireAuth, fulfillSupplierPool);

// Admin-only: real pooled demand across every category, used as leverage
// when negotiating with a real supplier, and the tool to attach one once a
// deal is signed. Each handler checks admin itself.
router.get('/admin/demand-overview', requireAuth, getOverview);
router.get('/admin/unassigned-pools', requireAuth, getUnassigned);
router.get('/admin/partners', requireAuth, getPartnersList);
router.post('/admin/assign-partner', requireAuth, assignPartner);

export default router;
