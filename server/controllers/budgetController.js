import prisma from '../config/db.js';

export async function getPlanBudget(req, res) {
  const { planId } = req.params;
  try {
    const plan = await prisma.preparationPlan.findUnique({
      where: { id: planId },
      include: { pledges: true, ceremony: { include: { costItems: true } } },
    });
    if (!plan || plan.hostId !== req.userId) return res.status(403).json({ error: 'Not your plan' });

    const budgetZAR = plan.ceremony?.budgetZAR == null ? null : Number(plan.ceremony.budgetZAR);
    const costItems = plan.ceremony?.costItems || [];
    const totalEstimated = costItems.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitCost || 0), 0);
    const totalActual = costItems.filter((item) => item.isPurchased).reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitCost || 0), 0);
    const totalPledged = plan.pledges.reduce((sum, pledge) => sum + Number(pledge.pledgedAmountZAR || 0), 0);

    res.json({
      budgetZAR,
      totalEstimated,
      totalActual,
      totalPledged,
      remaining: budgetZAR == null ? null : budgetZAR - totalActual,
      pledgeShortfall: budgetZAR == null ? null : Math.max(0, budgetZAR - totalPledged),
      shortfall: totalEstimated - totalPledged,
      itemBreakdown: costItems.map((item) => ({
        id: item.id, label: item.label, phase: item.phase,
        quantity: Number(item.quantity || 0), unit: item.unit,
        unitCost: Number(item.unitCost || 0),
        total: Number(item.quantity || 0) * Number(item.unitCost || 0),
        isPurchased: item.isPurchased,
      })),
    });
  } catch (error) {
    console.error('Get plan budget error:', error.message);
    res.status(500).json({ error: 'Could not fetch budget' });
  }
}
