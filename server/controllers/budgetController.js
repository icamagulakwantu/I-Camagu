import prisma from '../config/db.js';

export async function getPlanBudget(req, res) {
  const { planId } = req.params;
  try {
    const plan = await prisma.preparationPlan.findUnique({
      where: { id: planId },
      include: { checklistItems: true, pledges: true },
    });
    if (!plan || plan.hostId !== req.userId) return res.status(403).json({ error: 'Not your plan' });

    const totalEstimated = plan.checklistItems.reduce((sum, i) => sum + parseFloat(i.targetCostZAR || 0), 0);
    const totalActual = plan.checklistItems.reduce((sum, i) => sum + parseFloat(i.actualCostZAR || 0), 0);
    const totalPledged = plan.pledges.reduce((sum, p) => sum + parseFloat(p.pledgedAmountZAR || 0), 0);

    res.json({
      totalEstimated, totalActual, totalPledged,
      shortfall: totalEstimated - totalPledged,
      itemBreakdown: plan.checklistItems.map(i => ({
        label: i.label, phase: i.phase, targetCostZAR: i.targetCostZAR, actualCostZAR: i.actualCostZAR,
      })),
    });
  } catch (error) {
    console.error('Get plan budget error:', error.message);
    res.status(500).json({ error: 'Could not fetch budget' });
  }
}