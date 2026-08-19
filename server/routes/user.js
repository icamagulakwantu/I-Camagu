import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { setUsername, updateIziduko, updateProfile, setUserPin, checkPinStatus } from '../controllers/userController.js';

const router = express.Router();
router.post('/username', requireAuth, setUsername);
router.patch('/iziduko', requireAuth, updateIziduko);
router.patch('/profile', requireAuth, updateProfile);
router.post('/pin', requireAuth, setUserPin);
router.get('/pin/status', requireAuth, checkPinStatus);

export default router;
