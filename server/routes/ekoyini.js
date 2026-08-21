import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getAllQuoteRequests, updateQuoteStatus, submitQuoteRequest, getMyQuoteRequests } from '../controllers/quoteController.js';
import {
      createBarBooking, addWristbandTier, getBarBooking, removeWristbandTier,
        createTourismPackage, toggleTourismPackage, getTourismPackage,
        logTourismBooking, getTourismBookings,
} from '../controllers/ekoyiniController.js';

const router = express.Router();
router.post('/bar-bookings', requireAuth, createBarBooking);
router.post('/bar-bookings/wristbands', requireAuth, addWristbandTier);
router.get('/bar-bookings/:ceremonyId', requireAuth, getBarBooking);
router.delete('/bar-bookings/wristbands/:tierId', requireAuth, removeWristbandTier);
router.post('/tourism', requireAuth, createTourismPackage);
router.get('/tourism/:ceremonyId', requireAuth, getTourismPackage);
router.post('/quote', requireAuth, submitQuoteRequest);
router.get('/quote/mine', requireAuth, getMyQuoteRequests);
router.get('/quote/all', requireAuth, getAllQuoteRequests);
router.patch('/quote/status', requireAuth, updateQuoteStatus);
router.patch('/tourism/toggle', requireAuth, toggleTourismPackage);
router.post('/tourism/bookings', requireAuth, logTourismBooking);
router.get('/tourism/:tourismPackageId/bookings', requireAuth, getTourismBookings);

export default router;