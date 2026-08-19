// server/routes/reconciliation.js
// iCamagu — Reconciliation Routes
// Culture before capital. 🌾

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
      createRawLog,
        triggerReconciliation,
          getUnmatched,
            assignTransaction,
              getLedger,
} from '../controllers/reconciliationController.js';

const router = express.Router();

// Officials only: log a manual EFT transaction
router.post('/raw-log', requireAuth, createRawLog);

// Officials only: trigger reconciliation run
router.post('/reconcile/:stokvelId', requireAuth, triggerReconciliation);

// Officials only: view unmatched queue
router.get('/unmatched/:stokvelId', requireAuth, getUnmatched);

// Officials only: manually assign unmatched transaction
router.post('/assign', requireAuth, assignTransaction);

// Members: view group ledger
router.get('/ledger/:stokvelId', requireAuth, getLedger);

export default router;
