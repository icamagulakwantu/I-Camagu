import prisma from '../config/db.js';

export async function getMyActivity(req, res) {
      const userId = req.userId;
        try {
                const [contributions, payouts, plans, orders] = await Promise.all([
                          prisma.contribution.findMany({ where: { memberId: userId }, include: { stokvel: true }, orderBy: { createdAt: 'desc' }, take: 10 }),
                                prisma.payout.findMany({ where: { recipientId: userId }, include: { stokvel: true }, orderBy: { createdAt: 'desc' }, take: 10 }),
                                      prisma.preparationPlan.findMany({ where: { hostId: userId, isTemplate: false }, orderBy: { createdAt: 'desc' }, take: 10 }),
                                            prisma.orderLineConfirmation.findMany({ where: { memberId: userId }, include: { document: true }, orderBy: { confirmedAt: 'desc' }, take: 10 }),
                ]);

                    const feed = [
                              ...contributions.map(c => ({
                                          type: 'CONTRIBUTION', date: c.createdAt,
                                                  text: `You submitted R${parseFloat(c.amount).toFixed(2)} to ${c.stokvel.name}`,
                                                          status: c.status,
                              })),
                                    ...payouts.map(p => ({
                                                type: 'PAYOUT', date: p.createdAt,
                                                        text: `Payout of R${parseFloat(p.amount).toFixed(2)} from ${p.stokvel.name}`,
                                                                status: p.status,
                                    })),
                                          ...plans.map(p => ({
                                                      type: 'CEREMONY', date: p.createdAt,
                                                              text: `Started planning "${p.title}"`,
                                                                      status: null,
                                          })),
                                                ...orders.filter(o => o.confirmedAt).map(o => ({
                                                            type: 'ORDER', date: o.confirmedAt,
                                                                    text: `Confirmed ${o.quantity} ${o.unitType.toLowerCase()}(s) of ${o.itemDescription}`,
                                                                            status: null,
                                                })),
                    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 25);

                        res.json(feed);
        } catch (error) {
                console.error('Get activity error:', error.message);
                    res.status(500).json({ error: 'Could not fetch activity' });
        }
}
