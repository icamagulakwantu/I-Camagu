import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { setUsername, checkUsernameAvailable, updateIziduko, updateProfile, setUserPin, checkPinStatus } from '../controllers/userController.js';

const router = express.Router();
router.get('/username/available', requireAuth, checkUsernameAvailable);
router.post('/username', requireAuth, setUsername);
router.patch('/iziduko', requireAuth, updateIziduko);
router.patch('/profile', requireAuth, updateProfile);
router.post('/pin', requireAuth, setUserPin);
router.get('/pin/status', requireAuth, checkPinStatus);

export default router;