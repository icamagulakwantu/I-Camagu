import prisma from '../config/db.js';
import {
  StorageError,
  createSignedUploadUrl,
  uploadToSupabaseStorage,
  createSignedStorageUrl,
  createSignedStorageUrls,
} from '../services/storageService.js';

export const MAX_MEDIA_BYTES = 50 * 1024 * 1024;
const MEDIA_TYPES = new Set(['PHOTO', 'VIDEO']);

// Plain-language messages for each storage reason code. The code itself is
// returned too ("Ref: ...") so the founder can tell causes apart from a
// screenshot, without exposing any server detail.
const STORAGE_MESSAGES = {
  NOT_CONFIGURED: 'Photo storage is not switched on for iCamagu yet.',
  KEY_REJECTED: 'Photo storage refused our server key.',
  BUCKET_UNAVAILABLE: 'The family photo store could not be opened.',
  STORAGE_UNREACHABLE: 'Photo storage could not be reached. Please try again in a minute.',
  FILE_TOO_LARGE: 'That file is too large for photo storage.',
  FILE_NOT_FOUND: 'The upload did not finish. Please try again.',
};

function sendStorageError(res, error, context) {
  const reason = error instanceof StorageError ? error.code : 'SERVER_ERROR';
  console.error(`${context} [${reason}]:`, error?.message);
  const status = reason === 'FILE_TOO_LARGE' ? 413 : reason === 'FILE_NOT_FOUND' ? 400 : 503;
  res.status(status).json({
    error: STORAGE_MESSAGES[reason] || 'We could not save this memory right now. Please try again.',
    reason,
  });
}

async function findOwnPortal(portalId, userId) {
  if (!portalId || typeof portalId !== 'string') return null;
  const portal = await prisma.digitalPortal.findUnique({ where: { id: portalId } });
  if (!portal || portal.deletedAt || portal.createdById !== userId) return null;
  return portal;
}

function safeFileName(name) {
  const cleaned = String(name || 'memory').replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-');
  return cleaned.slice(-80) || 'memory';
}

const portalPrefix = (userId, portalId) => `${userId}/${portalId}/`;

function isPathInPortal(path, userId, portalId) {
  return typeof path === 'string'
    && path.startsWith(portalPrefix(userId, portalId))
    && !path.includes('..')
    && path.length < 300;
}

function validateUpload({ mediaType, contentType, size }) {
  if (!MEDIA_TYPES.has(mediaType)) return 'mediaType must be PHOTO or VIDEO';
  const expected = mediaType === 'VIDEO' ? 'video/' : 'image/';
  if (contentType && !String(contentType).startsWith(expected)) return 'Only photos and videos can be added';
  if (Number(size) > MAX_MEDIA_BYTES) return 'File too large. Max 50MB.';
  return null;
}

async function withSignedMedia(portal) {
  if (!portal) return portal;
  const media = (portal.media || []).filter((m) => !m.deletedAt);
  let urls = new Map();
  try {
    urls = await createSignedStorageUrls(media.map((m) => m.url));
  } catch (error) {
    // Still show the portal (and its count); thumbnails fall back to a placeholder.
    console.error('Sign portal media error:', error?.message);
  }
  return { ...portal, media: media.map((m) => ({ ...m, url: urls.get(m.url) ?? null })) };
}

export async function createPortal(req, res) {
  const { title, ceremonyType, visibility } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });

  try {
    const portal = await prisma.digitalPortal.create({
      data: {
        createdById: req.userId,
        title,
        ceremonyType: ceremonyType || null,
        visibility: visibility || 'FAMILY_PRIVATE',
      },
    });
    res.status(201).json({ ...portal, media: [] });
  } catch (error) {
    console.error('Create portal error:', error.message);
    res.status(500).json({ error: 'Could not create portal' });
  }
}

export async function getMyPortals(req, res) {
  try {
    const portals = await prisma.digitalPortal.findMany({
      where: { createdById: req.userId, deletedAt: null },
      include: { media: { where: { deletedAt: null }, orderBy: { uploadedAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(await Promise.all(portals.map(withSignedMedia)));
  } catch (error) {
    console.error('Get portals error:', error.message);
    res.status(500).json({ error: 'Could not fetch portals' });
  }
}

// Step 1 of a direct upload: hand the browser a one-time link for one file.
export async function requestMediaUpload(req, res) {
  const { portalId, fileName, contentType, size, mediaType } = req.body || {};
  const invalid = validateUpload({ mediaType, contentType, size });
  if (invalid) return res.status(400).json({ error: invalid });

  try {
    const portal = await findOwnPortal(portalId, req.userId);
    if (!portal) return res.status(403).json({ error: 'Not your portal' });

    const storagePath = `${portalPrefix(req.userId, portalId)}${Date.now()}-${safeFileName(fileName)}`;
    const uploadUrl = await createSignedUploadUrl(storagePath);
    res.json({ uploadUrl, storagePath });
  } catch (error) {
    sendStorageError(res, error, 'Request media upload error');
  }
}

// Step 2: the browser has put the file in storage; record it in the portal.
export async function confirmMediaUpload(req, res) {
  const { portalId, storagePath, mediaType } = req.body || {};
  if (!MEDIA_TYPES.has(mediaType)) return res.status(400).json({ error: 'mediaType must be PHOTO or VIDEO' });

  try {
    const portal = await findOwnPortal(portalId, req.userId);
    if (!portal) return res.status(403).json({ error: 'Not your portal' });
    if (!isPathInPortal(storagePath, req.userId, portalId)) {
      return res.status(400).json({ error: 'Upload does not belong to this portal' });
    }

    // Signing fails with FILE_NOT_FOUND if the file never arrived, so this
    // doubles as the check that the upload really finished.
    const url = await createSignedStorageUrl(storagePath);
    const existing = await prisma.portalMedia.findFirst({ where: { portalId, url: storagePath, deletedAt: null } });
    const media = existing || await prisma.portalMedia.create({ data: { portalId, mediaType, url: storagePath } });
    res.status(existing ? 200 : 201).json({ ...media, url });
  } catch (error) {
    sendStorageError(res, error, 'Confirm media upload error');
  }
}

// Fallback for browsers that cannot reach storage directly. The whole file
// is held in memory here, so the client only uses this for small photos.
export async function addMedia(req, res) {
  try {
    const request = new Request('http://localhost', {
      method: req.method,
      headers: { 'content-type': req.headers['content-type'] || '' },
      body: req,
      duplex: 'half',
    });
    const formData = await request.formData();
    const file = formData.get('file');
    const portalId = formData.get('portalId');
    const mediaType = formData.get('mediaType');

    if (!portalId || !mediaType || !file || typeof file.arrayBuffer !== 'function') {
      return res.status(400).json({ error: 'portalId, mediaType, and file are required' });
    }
    const invalid = validateUpload({ mediaType, contentType: file.type, size: file.size });
    if (invalid) return res.status(400).json({ error: invalid });

    const portal = await findOwnPortal(portalId, req.userId);
    if (!portal) return res.status(403).json({ error: 'Not your portal' });

    const storagePath = `${portalPrefix(req.userId, portalId)}${Date.now()}-${safeFileName(file.name)}`;
    await uploadToSupabaseStorage(file, storagePath);

    const media = await prisma.portalMedia.create({
      data: { portalId, mediaType, url: storagePath },
    });

    res.status(201).json({ ...media, url: await createSignedStorageUrl(storagePath) });
  } catch (error) {
    sendStorageError(res, error, 'Add media error');
  }
}

export async function softDeleteMedia(req, res) {
  const { mediaId } = req.params;
  try {
    const media = await prisma.portalMedia.findUnique({
      where: { id: mediaId },
      include: { portal: true },
    });
    if (!media || media.portal.createdById !== req.userId) return res.status(403).json({ error: 'Not your media' });

    await prisma.portalMedia.update({
      where: { id: mediaId },
      data: { deletedAt: new Date() },
    });
    res.json({ message: 'Memory moved to trash' });
  } catch (error) {
    console.error('Delete media error:', error.message);
    res.status(500).json({ error: 'Could not delete media' });
  }
}

export async function softDeletePortal(req, res) {
  const { portalId } = req.params;
  try {
    const portal = await prisma.digitalPortal.findUnique({ where: { id: portalId } });
    if (!portal || portal.createdById !== req.userId) return res.status(403).json({ error: 'Not your portal' });

    await prisma.digitalPortal.update({ where: { id: portalId }, data: { deletedAt: new Date() } });
    res.json({ message: 'Portal archived (soft-deleted, never permanently removed)' });
  } catch (error) {
    console.error('Delete portal error:', error.message);
    res.status(500).json({ error: 'Could not archive portal' });
  }
}
