import prisma from '../config/db.js';
import { isAdminEmail } from '../config/admin.js';

// Configuration
const MAX_DOC_SIZE_BYTES = 2_000_000; // ~2MB Limit

/**
 * Fetch practitioners filtered by role and area, prioritizing verified profiles
 */
export async function getPractitioners(req, res) {
  const { role, area } = req.query;
  try {
    const where = {};
    if (role) where.role = role;
    if (area) where.area = { contains: area, mode: 'insensitive' };

    const practitioners = await prisma.practitioner.findMany({
      where,
      orderBy: [
        { isVerified: 'desc' },
        { name: 'asc' },
      ],
      select: {
        id: true, name: true, role: true, area: true, userId: true,
        isVerified: true, verifiedAt: true, contactInfo: true, createdAt: true,
        confirmCount: true, disputeCount: true,
        // idDocUrl deliberately excluded — this endpoint is public and unauthenticated,
        // a practitioner's uploaded ID document must never be returned here.
      },
    });

    res.json(practitioners);
  } catch (error) {
    console.error('Get practitioners error:', error.message);
    res.status(500).json({ error: 'Could not fetch practitioners' });
  }
}

/**
 * Register a new practitioner profile with document payload size validation
 */
export async function addPractitioner(req, res) {
  const { name, role, area, contactInfo, idDocUrl } = req.body;

  if (!name || !role || !area) {
    return res.status(400).json({ error: 'name, role, and area are required' });
  }

  if (idDocUrl && idDocUrl.length > MAX_DOC_SIZE_BYTES) {
    return res.status(400).json({ error: 'Document image too large — please choose a smaller file' });
  }

  try {
    const practitioner = await prisma.practitioner.create({
      data: {
        userId: req.userId,
        name,
        role,
        area,
        contactInfo: contactInfo || null,
        idDocUrl: idDocUrl || null,
        isVerified: false,
      },
    });

    res.status(201).json(practitioner);
  } catch (error) {
    console.error('Add practitioner error:', error.message);
    res.status(500).json({ error: 'Could not add practitioner' });
  }
}

/**
 * Admin action to verify a practitioner profile
 */
export async function verifyPractitioner(req, res) {
  const { practitionerId } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });

    if (!user || !isAdminEmail(user.email)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const practitioner = await prisma.practitioner.update({
      where: { id: practitionerId },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
      },
    });

    res.json(practitioner);
  } catch (error) {
    console.error('Verify practitioner error:', error.message);
    res.status(500).json({ error: 'Could not verify practitioner' });
  }
}

/**
 * Fetch vendors filtered by category and area
 */
export async function getVendors(req, res) {
  const { category, area } = req.query;
  try {
    const where = {};
    if (category) where.category = category;
    if (area) where.area = { contains: area, mode: 'insensitive' };

    const vendors = await prisma.vendor.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    res.json(vendors);
  } catch (error) {
    console.error('Get vendors error:', error.message);
    res.status(500).json({ error: 'Could not fetch vendors' });
  }
}

/**
 * Register a new vendor profile
 */
export async function addVendor(req, res) {
  const { name, category, area, contactInfo, description } = req.body;

  if (!name || !category || !area) {
    return res.status(400).json({ error: 'name, category, and area are required' });
  }

  try {
    const vendor = await prisma.vendor.create({
      data: {
        createdById: req.userId,
        name,
        category,
        area,
        contactInfo: contactInfo || null,
        description: description || null,
      },
    });

    res.status(201).json(vendor);
  } catch (error) {
    console.error('Add vendor error:', error.message);
    res.status(500).json({ error: 'Could not add vendor' });
  }
}

export async function deleteVendor(req, res) {
  const { vendorId } = req.params;
  try {
    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
    if (vendor.createdById !== req.userId) return res.status(403).json({ error: 'You can only remove listings you created' });

    await prisma.vendor.delete({ where: { id: vendorId } });
    res.json({ message: 'Vendor listing removed' });
  } catch (error) {
    console.error('Delete vendor error:', error.message);
    res.status(500).json({ error: 'Could not remove vendor listing' });
  }
}

const DIRECTORY_MODEL = { PRACTITIONER: 'practitioner', VENDOR: 'vendor' };
const COUNT_FIELD = { CONFIRM: 'confirmCount', DISPUTE: 'disputeCount' };

/**
 * Cast, switch, or withdraw a community confirm/dispute vote on a
 * practitioner or vendor listing. One vote per user per listing — voting
 * the same way again withdraws it, voting the other way switches it.
 */
export async function castDirectoryVote(req, res) {
  const { targetType, targetId, voteType } = req.body;

  if (!DIRECTORY_MODEL[targetType]) return res.status(400).json({ error: 'Invalid targetType' });
  if (!COUNT_FIELD[voteType]) return res.status(400).json({ error: 'Invalid voteType' });

  try {
    const model = prisma[DIRECTORY_MODEL[targetType]];
    const target = await model.findUnique({ where: { id: targetId } });
    if (!target) return res.status(404).json({ error: 'Listing not found' });

    const ownerId = targetType === 'PRACTITIONER' ? target.userId : target.createdById;
    if (ownerId === req.userId) return res.status(403).json({ error: "You can't vote on your own listing" });

    const existing = await prisma.directoryVote.findUnique({
      where: { targetType_targetId_userId: { targetType, targetId, userId: req.userId } },
    });

    let updated;
    let myVote;
    if (!existing) {
      [, updated] = await prisma.$transaction([
        prisma.directoryVote.create({ data: { targetType, targetId, userId: req.userId, voteType } }),
        model.update({ where: { id: targetId }, data: { [COUNT_FIELD[voteType]]: { increment: 1 } } }),
      ]);
      myVote = voteType;
    } else if (existing.voteType === voteType) {
      [, updated] = await prisma.$transaction([
        prisma.directoryVote.delete({ where: { id: existing.id } }),
        model.update({ where: { id: targetId }, data: { [COUNT_FIELD[voteType]]: { decrement: 1 } } }),
      ]);
      myVote = null;
    } else {
      [, updated] = await prisma.$transaction([
        prisma.directoryVote.update({ where: { id: existing.id }, data: { voteType } }),
        model.update({
          where: { id: targetId },
          data: {
            [COUNT_FIELD[existing.voteType]]: { decrement: 1 },
            [COUNT_FIELD[voteType]]: { increment: 1 },
          },
        }),
      ]);
      myVote = voteType;
    }

    res.json({ confirmCount: updated.confirmCount, disputeCount: updated.disputeCount, myVote });
  } catch (error) {
    console.error('Cast directory vote error:', error.message);
    res.status(500).json({ error: 'Could not record your vote' });
  }
}

/**
 * The requesting user's own votes across all listings, so the UI can show
 * which button they've already pressed without exposing anyone else's vote.
 */
export async function getMyDirectoryVotes(req, res) {
  try {
    const votes = await prisma.directoryVote.findMany({
      where: { userId: req.userId },
      select: { targetType: true, targetId: true, voteType: true },
    });
    res.json(votes);
  } catch (error) {
    console.error('Get my directory votes error:', error.message);
    res.status(500).json({ error: 'Could not fetch your votes' });
  }
}
