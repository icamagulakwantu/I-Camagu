// Share links are bearer credentials, so they must be short-lived. The
// timestamp is encoded in the opaque token to avoid a production schema change.
// Regenerating a link replaces the previous token and therefore revokes it.
export const SHARE_LINK_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function createShareToken(now = Date.now(), random = '') {
  return `${now.toString(36)}-${random}`;
}

export function isShareTokenValid(token, now = Date.now()) {
  if (typeof token !== 'string') return false;
  const match = token.match(/^([0-9a-z]+)-[a-f0-9]{32}$/i);
  if (!match) return false;
  const createdAt = Number.parseInt(match[1], 36);
  if (!Number.isFinite(createdAt) || createdAt > now) return false;
  return now - createdAt <= SHARE_LINK_TTL_MS;
}
