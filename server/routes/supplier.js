import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { becomeSupplier, getMySupplierProfile, getMySupplierPools, confirmSupplierPoolPayment, processSupplierRefund, fulfillSupplierPool } from '../controllers/supplierController.js';

const router = express.Router();

router.post('/register', requireAuth, becomeSupplier);
router.get('/me', requireAuth, getMySupplierProfile);
router.get('/pools', requireAuth, getMySupplierPools);
router.post('/pool-payments/:paymentId/confirm', requireAuth, confirmSupplierPoolPayment);
router.post('/pool-payments/:paymentId/refund', requireAuth, processSupplierRefund);
router.post('/pools/:poolId/fulfill', requireAuth, fulfillSupplierPool);

export default router;
