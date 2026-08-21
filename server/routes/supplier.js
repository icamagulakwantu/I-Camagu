import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { becomeSupplier, getMySupplierProfile, getMySupplierPools } from '../controllers/supplierController.js';

const router = express.Router();

router.post('/register', requireAuth, becomeSupplier);
router.get('/me', requireAuth, getMySupplierProfile);
router.get('/pools', requireAuth, getMySupplierPools);

export default router;
