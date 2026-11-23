import prisma from '../config/db.js';
import { encryptSensitive, decryptSensitive } from '../services/encryptionService.js';
import { validateSaIdNumber } from '../services/idValidation.js';
import { isAdminEmail } from '../config/admin.js';

const MAX_DOC_SIZE_BYTES = 2_000_000; // ~2MB, matches Directory's practitioner idDocUrl limit

export const ID_DOCUMENT_TYPES = ['SMART_ID', 'GREEN_BOOK'];

// A photo sent as a data URL: JPEG, PNG or WebP, at most MAX_DOC_SIZE_BYTES.
// Returns an error message, or null when the photo is fine.
export function checkIdPhoto(value, label) {
  if (typeof value !== 'string') return `${label} must be a JPEG, PNG or WebP image`;
  const imageData = value.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/i);
  if (!imageData) return `${label} must be a valid JPEG, PNG or WebP image`;
  const base64 = imageData[2];
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  const decodedBytes = Math.floor(base64.length * 3 / 4) - padding;
  if (decodedBytes > MAX_DOC_SIZE_BYTES) return `${label} is too large — please use a smaller image (max 2MB)`;
  return null;
}

// A smart ID card needs its front and its back; a green ID book its photo
// page. Older apps send only idDocumentUrl and no type: that is still
// accepted as one photo, so nobody mid-way through is turned away.
export async function submitIdentityVerification(req, res) {
  const userId = req.userId;
  const { idNumber, idDocumentUrl } = req.body;
  const idDocumentType = req.body.idDocumentType ?? null;
  const idDocumentBackUrl = req.body.idDocumentBackUrl ?? null;

  if (!idNumber || !idDocumentUrl) {
    return res.status(400).json({ error: 'idNumber and idDocumentUrl (a photo of your ID) are both required' });
  }
  if (idDocumentType !== null && !ID_DOCUMENT_TYPES.includes(idDocumentType)) {
    return res.status(400).json({ error: 'Choose your ID: a smart ID card or a green ID book' });
  }
  if (idDocumentType === 'SMART_ID' && !idDocumentBackUrl) {
    return res.status(400).json({ error: 'Add a photo of the back of your smart ID card too' });
  }
  if (idDocumentType !== 'SMART_ID' && idDocumentBackUrl) {
    return res.status(400).json({ error: 'Only a smart ID card has a back photo' });
  }
  const frontError = checkIdPhoto(idDocumentUrl, idDocumentType === 'GREEN_BOOK' ? 'ID book photo' : 'ID document');
  if (frontError) return res.status(400).json({ error: frontError });
  if (idDocumentBackUrl) {
    const backError = checkIdPhoto(idDocumentBackUrl, 'Back of ID photo');
    if (backError) return res.status(400).json({ error: backError });
  }
  const check = validateSaIdNumber(idNumber);
  if (!check.valid) return res.status(400).json({ error: check.reason });

  try {
    const digits = String(idNumber).trim();
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        idNumberEncrypted: encryptSensitive(digits),
        idNumberLast4: digits.slice(-4),
        idDocumentUrl,
        idDocumentType,
        idDocumentBackUrl,
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
        idNumberEncrypted: true, idNumberLast4: true, idDocumentUrl: true, idDocumentType: true, idDocumentBackUrl: true, profileImage: true,
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
      idDocumentType: u.idDocumentType,
      idDocumentBackUrl: u.idDocumentBackUrl,
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
