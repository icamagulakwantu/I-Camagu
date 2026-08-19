import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { exportMyData, deleteMyAccount } from '../controllers/accountController.js';

const router = express.Router();
router.get('/export', requireAuth, exportMyData);
router.post('/delete', requireAuth, deleteMyAccount);

export default router;
