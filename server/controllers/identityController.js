import prisma from '../config/db.js';
import { encryptSensitive, decryptSensitive } from '../services/encryptionService.js';
import { validateSaIdNumber } from '../services/idValidation.js';
import { isAdminEmail } from '../config/admin.js';

const MAX_DOC_SIZE_BYTES = 2_000_000; // ~2MB, matches Directory's practitioner idDocUrl limit

export async function submitIdentityVerification(req, res) {
  const userId = req.userId;
  const { idNumber, idDocumentUrl } = req.body;

  if (!idNumber || !idDocumentUrl) {
    return res.status(400).json({ error: 'idNumber and idDocumentUrl (a photo of your ID) are both required' });
  }
  const check = validateSaIdNumber(idNumber);
  if (!check.valid) return res.status(400).json({ error: check.reason });
  if (idDocumentUrl.length > MAX_DOC_SIZE_BYTES) {
    return res.status(400).json({ error: 'ID document photo is too large — please use a smaller image (max ~2MB)' });
  }

  try {
    const digits = String(idNumber).trim();
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        idNumberEncrypted: encryptSensitive(digits),
        idNumberLast4: digits.slice(-4),
        idDocumentUrl,
        identityVerificationStatus: 'PENDING',
        identitySubmittedAt: new Date(),
        identityVerifiedAt: null,
        identityVerifiedById: null,
        identityRejectionReason: null,
      },
    });
    res.json({
      status: updated.identityVerificationStatus,
      last4: updated.idNumberLast4,
      submittedAt: updated.identitySubmittedAt,
      message: 'Submitted — an admin will review your ID shortly.',
    });
  } catch (error) {
    console.error('Submit identity verification error:', error.message);
    res.status(500).json({ error: 'Could not submit identity verification' });
  }
}

export async function getMyIdentityStatus(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        identityVerificationStatus: true,
        idNumberLast4: true,
        identitySubmittedAt: true,
        identityVerifiedAt: true,
        identityRejectionReason: true,
      },
    });
    res.json({
      status: user.identityVerificationStatus,
      last4: user.idNumberLast4,
      submittedAt: user.identitySubmittedAt,
      verifiedAt: user.identityVerifiedAt,
      rejectionReason: user.identityRejectionReason,
    });
  } catch (error) {
    console.error('Get identity status error:', error.message);
    res.status(500).json({ error: 'Could not fetch identity verification status' });
  }
}

export async function listPendingIdentityVerifications(req, res) {
  try {
    const admin = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!admin || !isAdminEmail(admin.email)) return res.status(403).json({ error: 'Admin access required' });

    const pending = await prisma.user.findMany({
      where: { identityVerificationStatus: 'PENDING' },
      select: {
        id: true, firstName: true, lastName: true, email: true,
        idNumberEncrypted: true, idNumberLast4: true, idDocumentUrl: true, profileImage: true,
        identitySubmittedAt: true,
      },
      orderBy: { identitySubmittedAt: 'asc' },
    });

    const withDecrypted = pending.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      idNumber: decryptSensitive(u.idNumberEncrypted),
      idDocumentUrl: u.idDocumentUrl,
      profileImage: u.profileImage,
      submittedAt: u.identitySubmittedAt,
    }));

    res.json(withDecrypted);
  } catch (error) {
    console.error('List pending identity verifications error:', error.message);
    res.status(500).json({ error: 'Could not fetch pending verifications' });
  }
}

export async function reviewIdentityVerification(req, res) {
  const { userId, approve, rejectionReason } = req.body;
  if (!userId || typeof approve !== 'boolean') {
    return res.status(400).json({ error: 'userId and approve (true/false) are required' });
  }

  try {
    const admin = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!admin || !isAdminEmail(admin.email)) return res.status(403).json({ error: 'Admin access required' });

    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (target.identityVerificationStatus !== 'PENDING') {
      return res.status(409).json({ error: 'This verification is not pending review' });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        identityVerificationStatus: approve ? 'VERIFIED' : 'REJECTED',
        identityVerifiedAt: new Date(),
        identityVerifiedById: req.userId,
        identityRejectionReason: approve ? null : (rejectionReason || 'Not specified'),
      },
    });

    const { createNotification } = await import('../services/notificationDbService.js');
    await createNotification(
      userId,
      'IDENTITY_VERIFICATION_REVIEWED',
      approve ? 'Your ID has been verified.' : `Your ID verification was not approved: ${updated.identityRejectionReason}`,
      'profile'
    );

    res.json({ status: updated.identityVerificationStatus, message: 'Review recorded' });
  } catch (error) {
    console.error('Review identity verification error:', error.message);
    res.status(500).json({ error: 'Could not record review' });
  }
}
