import prisma from '../config/db.js';
import { loadCostRows } from './ceremonyCostController.js';
import { summariseCosts, hasActual } from '../../shared/ceremonyCosts.js';

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
    const summary = summariseCosts({ budgetZAR, costItems: costRows, checklistItems: checklist });
    const totalPledged = plan.pledges.reduce((sum, pledge) => sum + Number(pledge.pledgedAmountZAR || 0), 0);

    const provisions = costRows.map((item) => ({
      id: item.id, label: item.label, phase: item.phase,
      quantity: item.quantity, unit: item.unit, unitCost: item.suggestedUnitCost,
      total: hasActual(item) ? item.actualCostZAR : item.suggestedTotal,
      isPurchased: hasActual(item),
    }));
    const paidTasks = checklist.filter(hasActual).map((item) => ({
      id: item.id, label: item.label, phase: item.phase,
      quantity: 1, unit: 'paid', unitCost: Number(item.actualCostZAR),
      total: Number(item.actualCostZAR), isPurchased: true,
    }));

    res.json({
      budgetZAR,
      totalEstimated: summary.projected,
      totalActual: summary.spent,
      totalPledged,
      remaining: summary.remaining,
      pledgeShortfall: budgetZAR == null ? null : Math.max(0, budgetZAR - totalPledged),
      shortfall: summary.projected - totalPledged,
      unforeseen: summary.unforeseen,
      itemBreakdown: [...provisions, ...paidTasks],
    });
  } catch (error) {
    console.error('Get plan budget error:', error.message);
    res.status(500).json({ error: 'Could not fetch budget' });
  }
}
