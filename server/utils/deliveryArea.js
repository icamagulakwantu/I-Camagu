// Pure helpers for "where is this order going?" — shared by checkout, the
// pool finder and pool matching, so all three agree on what "near" means.

// A "buy on my own" order is stored as a one-person BulkPool. radiusKm = 0 is
// the marker: no shared pool ever has a zero radius, so private orders are
// never offered to other members to join, with no database change needed.
export const PRIVATE_ORDER_RADIUS_KM = 0;
export const DEFAULT_POOL_RADIUS_KM = 20;
// How far the pool finder looks when showing pools near a typed address.
export const POOL_FINDER_RADIUS_KM = 30;

export function isPrivateOrderPool(pool) {
  return Number(pool?.radiusKm) === PRIVATE_ORDER_RADIUS_KM;
}

export function normaliseArea(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim().toLocaleLowerCase().replace(/\s+/g, ' ');
}

export function distanceKm(aLat, aLon, bLat, bLon) {
  const radians = (value) => value * Math.PI / 180;
  const dLat = radians(bLat - aLat);
  const dLon = radians(bLon - aLon);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(radians(aLat)) * Math.cos(radians(bLat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function hasCoordinates(point) {
  return Number.isFinite(point?.latitude) && Number.isFinite(point?.longitude)
    && Math.abs(point.latitude) <= 90 && Math.abs(point.longitude) <= 180;
}

// Distance from a delivery point to a pool, or null when it can't be measured
// (either side has no coordinates). Same-town pools without coordinates count
// as 0 km so they stay findable by name.
export function poolDistanceKm(pool, point, area) {
  if (hasCoordinates(point) && hasCoordinates(pool)) {
    return distanceKm(point.latitude, point.longitude, pool.latitude, pool.longitude);
  }
  return normaliseArea(area) && normaliseArea(area) === normaliseArea(pool?.area) ? 0 : null;
}

export function poolIsNear(pool, point, area, radiusKm = null) {
  const km = poolDistanceKm(pool, point, area);
  if (km == null) return false;
  return km <= (radiusKm ?? (pool?.radiusKm || DEFAULT_POOL_RADIUS_KM));
}

const STREET_WORDS = /\b(st|street|rd|road|ave|avenue|dr|drive|cres|crescent|lane|ln|way|close|cl|place|pl|blvd|boulevard|ext|extension|unit|flat|block|section|stand|erf|house|no)\b\.?/i;

// Best guess of the suburb/town from a typed address when the map lookup
// couldn't help: "12 Ncedo St, Motherwell, Gqeberha" -> "Motherwell".
export function guessAreaFromAddress(address) {
  const parts = String(address || '').split(',').map((part) => part.trim()).filter(Boolean);
  if (!parts.length) return '';
  const isStreety = (part) => /\d/.test(part) || STREET_WORDS.test(part);
  const candidate = parts.find((part) => !isStreety(part));
  if (candidate) return candidate.slice(0, 80);
  // Everything looks like a street line: strip the leading house number.
  return parts[parts.length - 1].replace(/^\d+[a-z]?\s+/i, '').slice(0, 80);
}

function cleanText(value, max) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

// Turns what the checkout sent (or, failing that, the member's profile) into
// one delivery: { address, area, latitude, longitude }. A typed address never
// borrows the profile's coordinates — that's how a Joburg member ordering for
// P.E. used to get matched to Joburg.
export function resolveDelivery(user, delivery) {
  const typedAddress = cleanText(delivery?.address, 300);
  if (typedAddress) {
    // null/'' must stay "no location", not become 0,0 via Number(null).
    const toCoord = (value) => (value === null || value === undefined || value === '' ? NaN : Number(value));
    const point = { latitude: toCoord(delivery.latitude), longitude: toCoord(delivery.longitude) };
    return {
      address: typedAddress,
      area: cleanText(delivery.area, 80) || guessAreaFromAddress(typedAddress),
      latitude: hasCoordinates(point) ? point.latitude : null,
      longitude: hasCoordinates(point) ? point.longitude : null,
    };
  }
  const profileAddress = cleanText(user?.address, 300);
  const profileArea = cleanText(user?.location, 80);
  return {
    address: profileAddress || profileArea,
    area: profileArea || guessAreaFromAddress(profileAddress),
    latitude: hasCoordinates(user) ? user.latitude : null,
    longitude: hasCoordinates(user) ? user.longitude : null,
  };
}
