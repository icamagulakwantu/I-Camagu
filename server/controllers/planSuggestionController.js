// Family suggestions: anyone with a shared plan link can suggest something the
// host forgot, without an account. A suggestion never changes the plan by
// itself: only the host can accept it onto the checklist or dismiss it. The
// link gives no access to the host's account or anything else.
import prisma from '../config/db.js';
import { findSharedPlan } from './publicPledgeController.js';
import { createNotification } from '../services/notificationDbService.js';

const MAX_LABEL = 120;
const MAX_NOTE = 300;
const MAX_NAME = 60;
// A plan cannot be flooded: past this many waiting suggestions, new ones wait.
export const MAX_PENDING_PER_PLAN = 100;
export const FAMILY_PHASE = 'FAMILY_SUGGESTIONS';

const clean = (value, max) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

export function parseSuggestion(body = {}) {
  const label = clean(body.label, MAX_LABEL);
  if (label.length < 2) return { error: 'Please say what should be added' };
  const rawPhase = clean(body.phase, 40);
  const phase = /^[A-Z][A-Z_]{1,39}$/.test(rawPhase) ? rawPhase : null;
  return {
    value: {
      label,
      phase,
      note: clean(body.note, MAX_NOTE) || null,
      suggestedBy: clean(body.suggestedBy, MAX_NAME) || null,
    },
  };
}

// POST /api/public/plan/:token/suggestions
export const addPublicSuggestion = async (req, res) => {
  try {
    const plan = await findSharedPlan(req.params.token, { id: true, hostId: true, title: true });
    if (!plan) return res.status(404).json({ error: 'This link is invalid or has expired. Ask the family for a new one.' });
    const parsed = parseSuggestion(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });

    const waiting = await prisma.planSuggestion.count({ where: { planId: plan.id, status: 'PENDING' } });
    if (waiting >= MAX_PENDING_PER_PLAN) {
      return res.status(429).json({ error: 'The host has many suggestions to look at. Please try again later.' });
    }
    const suggestion = await prisma.planSuggestion.create({
      data: { planId: plan.id, ...parsed.value },
      select: { id: true, label: true, phase: true },
    });
    const who = parsed.value.suggestedBy || 'A family member';
    createNotification(plan.hostId, 'PLAN_SUGGESTION', `${who} suggested "${parsed.value.label}" for ${plan.title}`, 'ceremonyhub')
      .catch((err) => console.error('Suggestion notification error:', err?.message));
    res.status(201).json(suggestion);
  } catch (error) {
    console.error('Add suggestion error:', error.message);
    res.status(500).json({ error: 'Could not send your suggestion. Please try again.' });
  }
};

// GET /api/public/plan/:token/suggestions: what is already waiting, so family
// do not suggest the same thing twice. Labels only, never names or notes.
export const listPublicSuggestions = async (req, res) => {
  try {
    const plan = await findSharedPlan(req.params.token, { id: true });
    if (!plan) return res.status(404).json({ error: 'This link is invalid or has expired' });
    const rows = await prisma.planSuggestion.findMany({
      where: { planId: plan.id, status: 'PENDING' },
      select: { id: true, label: true },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });
    res.json(rows);
  } catch (error) {
    console.error('List public suggestions error:', error.message);
    res.status(500).json({ error: 'Could not load suggestions' });
  }
};

async function ownPlan(planId, userId) {
  if (!planId) return null;
  const plan = await prisma.preparationPlan.findUnique({
    where: { id: planId },
    select: { id: true, hostId: true, ceremonyId: true, title: true },
  });
  return plan && plan.hostId === userId ? plan : null;
}

// GET /api/ceremonies/plans/:planId/suggestions (host only)
export const listPlanSuggestions = async (req, res) => {
  try {
    const plan = await ownPlan(req.params.planId, req.user.id);
    if (!plan) return res.status(403).json({ error: 'Not your plan' });
    const rows = await prisma.planSuggestion.findMany({
      where: { planId: plan.id, status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });
    res.json(rows);
  } catch (error) {
    console.error('List suggestions error:', error.message);
    res.status(500).json({ error: 'Could not load suggestions' });
  }
};

// POST /api/ceremonies/plans/suggestions/:id/accept (host only). Adds the item
// to the same checklist the ceremony page shows: the ceremony's own list when
// it has one, otherwise the plan's.
export const acceptSuggestion = async (req, res) => {
  try {
    const suggestion = await prisma.planSuggestion.findUnique({ where: { id: req.params.id } });
    if (!suggestion) return res.status(404).json({ error: 'Suggestion not found' });
    const plan = await ownPlan(suggestion.planId, req.user.id);
    if (!plan) return res.status(403).json({ error: 'Not your plan' });
    if (suggestion.status !== 'PENDING') return res.status(409).json({ error: 'This suggestion was already handled' });

    const phase = suggestion.phase || FAMILY_PHASE;
    const ceremonyItems = plan.ceremonyId
      ? await prisma.ceremonyChecklistItem.count({ where: { ceremonyId: plan.ceremonyId } })
      : 0;
    const item = await prisma.$transaction(async (tx) => {
      const created = ceremonyItems > 0
        ? await tx.ceremonyChecklistItem.create({ data: { ceremonyId: plan.ceremonyId, phase, label: suggestion.label } })
        : await tx.checklistItem.create({ data: { planId: plan.id, phase, label: suggestion.label } });
      await tx.planSuggestion.update({ where: { id: suggestion.id }, data: { status: 'ACCEPTED', resolvedAt: new Date() } });
      return created;
    });
    res.json({ ok: true, item: { id: item.id, phase: item.phase, label: item.label } });
  } catch (error) {
    console.error('Accept suggestion error:', error.message);
    res.status(500).json({ error: 'Could not add this suggestion' });
  }
};

// POST /api/ceremonies/plans/suggestions/:id/dismiss (host only)
export const dismissSuggestion = async (req, res) => {
  try {
    const suggestion = await prisma.planSuggestion.findUnique({ where: { id: req.params.id } });
    if (!suggestion) return res.status(404).json({ error: 'Suggestion not found' });
    const plan = await ownPlan(suggestion.planId, req.user.id);
    if (!plan) return res.status(403).json({ error: 'Not your plan' });
    await prisma.planSuggestion.updateMany({
      where: { id: suggestion.id, status: 'PENDING' },
      data: { status: 'DISMISSED', resolvedAt: new Date() },
    });
    res.json({ ok: true });
  } catch (error) {
    console.error('Dismiss suggestion error:', error.message);
    res.status(500).json({ error: 'Could not dismiss this suggestion' });
  }
};
