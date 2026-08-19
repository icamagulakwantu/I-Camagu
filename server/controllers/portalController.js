import prisma from '../config/db.js';
import { uploadToSupabaseStorage, createSignedStorageUrl } from '../services/storageService.js';

async function withSignedMedia(portal) {
  if (!portal) return portal;
  return {
    ...portal,
    media: await Promise.all(
      (portal.media || [])
        .filter(media => !media.deletedAt)
        .map(async media => ({ ...media, url: await createSignedStorageUrl(media.url) }))
    ),
  };
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
      include: { media: { where: { deletedAt: null } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(await Promise.all(portals.map(withSignedMedia)));
  } catch (error) {
    console.error('Get portals error:', error.message);
    res.status(500).json({ error: 'Could not fetch portals' });
  }
}

export async function addMedia(req, res) {
  try {
    const request = new Request('http://localhost', {
      method: req.method,
      headers: req.headers,
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

    const portal = await prisma.digitalPortal.findUnique({ where: { id: portalId } });
    if (!portal || portal.createdById !== req.userId) return res.status(403).json({ error: 'Not your portal' });

    const maxBytes = 50 * 1024 * 1024;
    if (file.size > maxBytes) return res.status(400).json({ error: 'File too large. Max 50MB.' });

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
    const storagePath = `${req.userId}/${portalId}/${Date.now()}-${safeName}`;
    await uploadToSupabaseStorage(file, storagePath);

    const media = await prisma.portalMedia.create({
      data: { portalId, mediaType, url: storagePath },
    });

    res.status(201).json({ ...media, url: await createSignedStorageUrl(storagePath) });
  } catch (error) {
    console.error('Add media error:', error.message);
    res.status(500).json({ error: 'Could not upload media' });
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
