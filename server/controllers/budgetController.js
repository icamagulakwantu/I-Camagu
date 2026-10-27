import prisma from '../config/db.js';
import { loadCostRows } from './ceremonyCostController.js';
import { hasActual, UNFORESEEN_PHASE } from '../../shared/ceremonyCosts.js';
import { buildListRows, summariseRows } from '../../shared/ceremonyList.js';

// The read-only budget screen now uses the same sums as the Checklist & Budget
// tab: only amounts actually paid are deducted from the budget, whether they
// were entered against a checklist task, a priced provision, or added as an
// unforeseen expense.
export async function getPlanBudget(req, res) {
  const { planId } = req.params;
  try {
    const plan = await prisma.preparationPlan.findUnique({
      where: { id: planId },
      include: { pledges: true, ceremony: { include: { checklistItems: true } } },
    });
    if (!plan || plan.hostId !== req.userId) return res.status(403).json({ error: 'Not your plan' });

    const costRows = plan.ceremony ? await loadCostRows(plan.ceremony.id) : [];
    const checklist = plan.ceremony?.checklistItems || [];
    const budgetZAR = plan.ceremony?.budgetZAR == null ? null : Number(plan.ceremony.budgetZAR);
    const rows = buildListRows({ costItems: costRows, checklistItems: checklist });
    const unforeseenItems = checklist.filter((item) => item.phase === UNFORESEEN_PHASE);
    // Reuse the same merged-row calculation as the main Checklist & Budget tab.
    // If a task and priced provision represent the same thing, an actual cost
    // recorded in both storage locations must still count only once.
    const summary = summariseRows({ budgetZAR, rows, unforeseenItems });
    const totalPledged = plan.pledges.reduce((sum, pledge) => sum + Number(pledge.pledgedAmountZAR || 0), 0);

    const itemBreakdown = [
      ...rows.filter((row) => row.kind !== 'note').map((row) => ({
        id: row.key,
        label: row.label,
        phase: row.phase,
        quantity: row.quantity || 1,
        unit: row.cost?.unit || 'item',
        unitCost: row.unitPrice ?? (row.actual != null ? row.actual : 0),
        total: row.actual != null ? row.actual : (row.suggested ?? 0),
        isPurchased: Boolean(row.done),
      })),
      ...unforeseenItems.map((item) => ({
        id: item.id, label: item.label, phase: item.phase,
        quantity: 1, unit: 'paid', unitCost: hasActual(item) ? Number(item.actualCostZAR) : 0,
        total: hasActual(item) ? Number(item.actualCostZAR) : 0, isPurchased: hasActual(item),
      })),
    ];

    res.json({
      budgetZAR,
      totalEstimated: summary.projected,
      totalActual: summary.spent,
      totalPledged,
      remaining: summary.remaining,
      pledgeShortfall: budgetZAR == null ? null : Math.max(0, budgetZAR - totalPledged),
      shortfall: summary.projected - totalPledged,
      unforeseen: summary.unforeseen,
      itemBreakdown,
    });
  } catch (error) {
    console.error('Get plan budget error:', error.message);
    res.status(500).json({ error: 'Could not fetch budget' });
  }
}
