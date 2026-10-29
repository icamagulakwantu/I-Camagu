import prisma from '../config/db.js';
import { isAdminEmail } from '../config/admin.js';
import { getDemandOverview, listUnassignedPools } from '../services/demandService.js';
import { acceptOffer } from '../services/offerService.js';

async function requireAdmin(req, res) {
  const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { email: true } });
  if (!user || !isAdminEmail(user.email)) {
    res.status(403).json({ error: 'Admin access required' });
    return false;
  }
  return true;
}

export async function getOverview(req, res) {
  if (!(await requireAdmin(req, res))) return;
  try {
    res.json(await getDemandOverview());
  } catch (error) {
    console.error('Get demand overview error:', error.message);
    res.status(500).json({ error: 'Could not fetch demand overview' });
  }
}

export async function getUnassigned(req, res) {
  if (!(await requireAdmin(req, res))) return;
  try {
    res.json(await listUnassignedPools());
  } catch (error) {
    console.error('List unassigned pools error:', error.message);
    res.status(500).json({ error: 'Could not fetch group orders' });
  }
}

export async function acceptPoolOffer(req, res) {
  if (!(await requireAdmin(req, res))) return;
  try {
    const result = await acceptOffer(req.params.offerId);
    res.json({ ...result, message: `${result.partnerName} confirmed for this group order. Members have been told to pay their share.` });
  } catch (error) {
    console.error('Accept offer error:', error.message);
    res.status(error.status || 500).json({ error: error.status ? error.message : 'Could not accept offer' });
  }
}
