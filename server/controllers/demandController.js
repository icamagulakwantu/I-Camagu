import prisma from '../config/db.js';
import { isAdminEmail } from '../config/admin.js';
import { getDemandOverview, listUnassignedPools, listPartnersForAssignment, assignPartnerToPool } from '../services/demandService.js';

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
    res.status(500).json({ error: 'Could not fetch unassigned pools' });
  }
}

export async function getPartnersList(req, res) {
  if (!(await requireAdmin(req, res))) return;
  try {
    res.json(await listPartnersForAssignment());
  } catch (error) {
    console.error('List partners error:', error.message);
    res.status(500).json({ error: 'Could not fetch partners' });
  }
}

export async function assignPartner(req, res) {
  if (!(await requireAdmin(req, res))) return;
  const { poolId, partnerId } = req.body;
  if (!poolId || !partnerId) return res.status(400).json({ error: 'poolId and partnerId are required' });
  try {
    const pool = await assignPartnerToPool(poolId, partnerId);
    res.json({ pool, message: `${pool.partner.name} attached to this pool.` });
  } catch (error) {
    console.error('Assign partner error:', error.message);
    res.status(error.status || 500).json({ error: error.status ? error.message : 'Could not assign partner' });
  }
}
