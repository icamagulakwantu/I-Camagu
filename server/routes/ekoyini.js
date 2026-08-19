import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getAllQuoteRequests, updateQuoteStatus } from '../controllers/quoteController.js';
import {
      createBarBooking, addWristbandTier, getBarBooking, removeWristbandTier,
        createTourismPackage, toggleTourismPackage,
} from '../controllers/ekoyiniController.js';

const router = express.Router();
router.post('/bar-bookings', requireAuth, createBarBooking);
router.post('/bar-bookings/wristbands', requireAuth, addWristbandTier);
router.get('/bar-bookings/:ceremonyId', requireAuth, getBarBooking);
router.delete('/bar-bookings/wristbands/:tierId', requireAuth, removeWristbandTier);
router.post('/tourism', requireAuth, createTourismPackage);
router.get('/quote/all', requireAuth, getAllQuoteRequests);
router.patch('/quote/status', requireAuth, updateQuoteStatus);
router.patch('/tourism/toggle', requireAuth, toggleTourismPackage);

export default router;