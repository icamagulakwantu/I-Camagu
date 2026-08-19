import express from 'express';
import { getPublicPlan } from '../controllers/ceremonyController.js';

const router = express.Router();
router.get('/plan/:token', getPublicPlan);

export default router;
