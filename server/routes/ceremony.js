import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getCeremonyTimeline } from '../controllers/ceremonyController.js';
import { getPlanBudget } from '../controllers/budgetController.js';
import { saveAsTemplate, getMyTemplates, useTemplate } from '../controllers/templateController.js';
import {
  generateShareLink,
  getPublicPlan,
  createCeremony,
  createPreparationPlan,
  getMyPlans,
  getMyCeremonies,
  toggleChecklistItem,
  updateChecklistItemCost,
  addPledge,
  deleteCeremony,
  deletePreparationPlan,
  // 👇 NEW imports
  createAutoCeremony,
  getCeremonyById,
  updateCeremony,
  updateChecklistItem,
  updateCostItem,
  getCostEstimate,
  addCeremonyChecklistItem,
  toggleCeremonyChecklistItem,
} from '../controllers/ceremonyController.js';

const router = express.Router();

// ─── EXISTING ROUTES (keep all) ────────────────────────────────────────────
router.get('/my', requireAuth, getMyCeremonies);
router.get('/timeline/:ceremonyType', getCeremonyTimeline);
router.post('/plans/:planId/share-link', requireAuth, generateShareLink);
router.post('/', requireAuth, createCeremony);
router.post('/templates/save', requireAuth, saveAsTemplate);
router.get('/templates/my', requireAuth, getMyTemplates);
router.post('/templates/use', requireAuth, useTemplate);
router.post('/plans', requireAuth, createPreparationPlan);
router.get('/plans/:planId/budget', requireAuth, getPlanBudget);
router.get('/plans/my', requireAuth, getMyPlans);
router.patch('/plans/items/:itemId/toggle', requireAuth, toggleChecklistItem);
router.patch('/plans/items/:itemId/cost', requireAuth, updateChecklistItemCost);
router.post('/plans/pledges', requireAuth, addPledge);
router.delete('/:ceremonyId', requireAuth, deleteCeremony);
router.delete('/plans/:planId', requireAuth, deletePreparationPlan);

// ─── NEW ROUTES ──────────────────────────────────────────────────────────────
// Auto‑generate ceremony with checklist & cost items
router.post('/auto', requireAuth, createAutoCeremony);

// Get a single ceremony with all its items
router.get('/:id', requireAuth, getCeremonyById);

// Update ceremony metadata
router.put('/:id', requireAuth, updateCeremony);

// Toggle checklist item (new version – works with the new ChecklistItem model)
router.patch('/checklist/:id', requireAuth, updateChecklistItem);
router.post('/:id/checklist', requireAuth, addCeremonyChecklistItem);
router.patch('/ceremony-checklist/:id/toggle', requireAuth, toggleCeremonyChecklistItem);

// Update a cost item (quantity, unitCost, etc.)
router.patch('/cost/:id', requireAuth, updateCostItem);

// Get cost estimate (sum of all cost items)
router.get('/:id/estimate', requireAuth, getCostEstimate);

export default router;
