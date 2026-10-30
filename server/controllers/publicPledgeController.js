import prisma from '../config/db.js';
import { isShareTokenValid } from '../utils/shareToken.js';
import { createNotification } from '../services/notificationDbService.js';

const MAX_NAME = 60;
const MAX_ITEM = 120;
const MAX_RELATIONSHIP = 40;
const MAX_AMOUNT_ZAR = 1_000_000;

async function findSharedPlan(token, select) {
  if (!token || !isShareTokenValid(token)) return null;
  return prisma.preparationPlan.findUnique({ where: { shareToken: token }, select });
}

const clean = (value, max) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

// Turns a family member's form into safe pledge fields, or an error message.
// Exported so the rules can be unit tested without a database.
export function parsePublicPledge(body = {}) {
  const pledgerName = clean(body.pledgerName, MAX_NAME);
  const pledgedItem = clean(body.pledgedItem, MAX_ITEM);
  const relationship = clean(body.relationship, MAX_RELATIONSHIP) || null;
  if (!pledgerName) return { error: 'Please add your name' };
  if (!pledgedItem) return { error: 'Please say what you will bring' };

  let pledgedAmountZAR = null;
  if (body.pledgedAmountZAR !== undefined && body.pledgedAmountZAR !== null && body.pledgedAmountZAR !== '') {
    const amount = Number(body.pledgedAmountZAR);
    if (!Number.isFinite(amount) || amount < 0 || amount > MAX_AMOUNT_ZAR) {
      return { error: 'Please type the value in rand, or leave it empty' };
    }
    pledgedAmountZAR = Math.round(amount * 100) / 100;
  }
  return { value: { pledgerName, pledgedItem, relationship, pledgedAmountZAR } };
}

// GET /api/public/plan/:token/pledges
// View-only list of the pledges on a shared ceremony plan. The token is the
// same one used by the shared checklist link, so the host controls who sees
// this by choosing who gets the link.
export const getPublicPlanPledges = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) return res.status(400).json({ error: 'Missing link' });
    if (!isShareTokenValid(token)) return res.status(404).json({ error: 'This link is invalid or has expired' });

    const plan = await prisma.preparationPlan.findUnique({
      where: { shareToken: token },
      select: { id: true },
    });
    if (!plan) return res.status(404).json({ error: 'This link is no longer valid' });

    const pledges = await prisma.contributionPledge.findMany({
      where: { planId: plan.id },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        pledgerName: true,
        relationship: true,
        pledgedItem: true,
        pledgedAmountZAR: true,
        paidAmountZAR: true,
      },
    });

    res.json(pledges.map((pledge) => {
      const pledged = pledge.pledgedAmountZAR == null ? null : Number(pledge.pledgedAmountZAR);
      const paid = pledge.paidAmountZAR == null ? 0 : Number(pledge.paidAmountZAR);
      // A bearer link may be forwarded beyond the intended family group.
      // Public links therefore show only the item and whether it was received;
      // names, relationships and pledged amounts stay behind authenticated access.
      return {
        id: pledge.id,
        pledgedItem: pledge.pledgedItem,
        isReceived: pledged !== null && pledged > 0 && paid >= pledged,
      };
    }));
  } catch (error) {
    console.error('Error loading public pledges:', error.message);
    res.status(500).json({ error: 'Could not load pledges' });
  }
};

// POST /api/public/plan/:token/pledges
// Ukugida from the shared link: a family member promises what they will
// bring without needing an account. Only the host sees their name and
// amount (the public list above stays anonymous). Rate limited per route.
export const addPublicPlanPledge = async (req, res) => {
  try {
    const { token } = req.params;
    const plan = await findSharedPlan(token, { id: true, hostId: true, title: true });
    if (!plan) return res.status(404).json({ error: 'This link is invalid or has expired. Ask the family for a new one.' });

    const parsed = parsePublicPledge(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });

    const pledge = await prisma.contributionPledge.create({
      data: { planId: plan.id, ...parsed.value },
      select: { id: true, pledgedItem: true },
    });

    // A failed notification must never lose the family member's pledge.
    createNotification(
      plan.hostId,
      'PLEDGE_RECEIVED',
      `${parsed.value.pledgerName} pledged ${parsed.value.pledgedItem} for ${plan.title}`,
      'ceremonyhub',
    ).catch((err) => console.error('Pledge notification error:', err?.message));

    res.status(201).json({ id: pledge.id, pledgedItem: pledge.pledgedItem, isReceived: false });
  } catch (error) {
    console.error('Error adding public pledge:', error.message);
    res.status(500).json({ error: 'Could not save your pledge. Please try again.' });
  }
};
