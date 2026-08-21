import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getPractitioners,
  addPractitioner,
  verifyPractitioner,
  getVendors,
  addVendor,
  deleteVendor,
} from '../controllers/directoryController.js';

const router = express.Router();

// --- Practitioner Routes ---
router
  .route('/practitioners')
  .get(getPractitioners)
  .post(requireAuth, addPractitioner);

router.post('/practitioners/verify', requireAuth, verifyPractitioner);

// --- Vendor Routes ---
router
  .route('/vendors')
  .get(getVendors)
  .post(requireAuth, addVendor);
router.delete('/vendors/:vendorId', requireAuth, deleteVendor);

export default router;
