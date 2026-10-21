import prisma from '../config/db.js';

// GET /api/public/plan/:token/pledges
// View-only list of the pledges on a shared ceremony plan. The token is the
// same one used by the shared checklist link, so the host controls who sees
// this by choosing who gets the link. Only the fields needed to read the list
// are returned: no ids of other records, no contact details.
export const getPublicPlanPledges = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) return res.status(400).json({ error: 'Missing link' });

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

    res.json(pledges);
  } catch (error) {
    console.error('Error loading public pledges:', error.message);
    res.status(500).json({ error: 'Could not load pledges' });
  }
};
