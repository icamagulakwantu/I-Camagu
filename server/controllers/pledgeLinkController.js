import prisma from '../config/db.js';

// POST /api/public/plan/:token/pledge (signed-in people only)
// Lets someone who opened a shared ceremony link add their own pledge to the
// host's plan. The share token identifies the plan; the pledger's name comes
// from their account, never from the request, so nobody can pledge as someone else.
export const addPledgeViaLink = async (req, res) => {
  try {
    const { token } = req.params;
    const pledgedItem = typeof req.body?.pledgedItem === 'string' ? req.body.pledgedItem.trim() : '';
    const rawAmount = req.body?.pledgedAmountZAR;

    if (!pledgedItem || pledgedItem.length > 200) {
      return res.status(400).json({ error: 'Tell us what you would like to give (up to 200 characters)' });
    }

    let amount = null;
    if (rawAmount !== undefined && rawAmount !== null && rawAmount !== '') {
      amount = parseFloat(rawAmount);
      if (isNaN(amount) || amount < 0) {
        return res.status(400).json({ error: 'The amount must be zero or more' });
      }
    }

    const plan = await prisma.preparationPlan.findUnique({
      where: { shareToken: token },
      select: { id: true, hostId: true, title: true },
    });
    if (!plan) return res.status(404).json({ error: 'This link is invalid or has expired' });
    if (plan.hostId === req.user.id) {
      return res.status(400).json({ error: 'This is your own ceremony. Share the link with family so they can pledge.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { firstName: true, lastName: true },
    });
    const pledgerName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'A family member';

    const pledge = await prisma.contributionPledge.create({
      data: {
        planId: plan.id,
        pledgerName,
        pledgedItem,
        pledgedAmountZAR: amount,
        paidAmountZAR: 0,
      },
    });

    res.status(201).json({ message: `Your pledge to ${plan.title} was added`, pledge });
  } catch (error) {
    console.error('Add pledge via link error:', error.message);
    res.status(500).json({ error: 'Could not save your pledge' });
  }
};
