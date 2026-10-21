import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getCeremonyTimeline } from '../controllers/ceremonyController.js';
import { getPlanBudget } from '../controllers/budgetController.js';
import { getCeremonyCosts, setCostActual } from '../controllers/ceremonyCostController.js';
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
  getCeremonyTypes,
  deletePledge,
  getPlanPledges,
  addCeremonyChecklistItem,
  toggleCeremonyChecklistItem,
} from '../controllers/ceremonyController.js';

const router = express.Router();

// ─── EXISTING ROUTES (keep all) ────────────────────────────────────────────
router.get('/types', requireAuth, getCeremonyTypes);
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
router.get('/plans/:planId/pledges', requireAuth, getPlanPledges);
router.post('/plans/pledges', requireAuth, addPledge);
router.delete('/plans/pledges/:pledgeId', requireAuth, deletePledge);
router.delete('/plans/:planId', requireAuth, deletePreparationPlan);
router.delete('/:ceremonyId', requireAuth, deleteCeremony);

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
// Record what was really paid for a priced item (deducted from the budget)
router.patch('/cost/:id/actual', requireAuth, setCostActual);

// Everything the combined Checklist & Budget tab shows
router.get('/:id/costs', requireAuth, getCeremonyCosts);

// Get cost estimate (sum of all cost items)
router.get('/:id/estimate', requireAuth, getCostEstimate);

export default router;
