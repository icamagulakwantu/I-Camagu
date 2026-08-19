import prisma from '../config/db.js';

// Configuration
const ADMIN_EMAILS = ['icamagulakwantu@gmail.com'];
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

    if (!user || !ADMIN_EMAILS.includes(user.email)) {
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
