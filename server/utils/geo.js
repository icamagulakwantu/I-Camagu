const EARTH_RADIUS_KM = 6371;

function toRadians(deg) {
  return (deg * Math.PI) / 180;
}

export function haversineKm(lat1, lon1, lat2, lon2) {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Sorts items with { latitude, longitude } by distance from (lat, lng), attaching
// distanceKm. Items missing coordinates sort last, in their original relative order.
export function sortByDistance(items, lat, lng) {
  if (lat == null || lng == null) return items;

  const withDistance = items.map((item) => ({
    ...item,
    distanceKm:
      item.latitude != null && item.longitude != null
        ? Math.round(haversineKm(lat, lng, item.latitude, item.longitude) * 10) / 10
        : null,
  }));

  return withDistance.sort((a, b) => {
    if (a.distanceKm == null && b.distanceKm == null) return 0;
    if (a.distanceKm == null) return 1;
    if (b.distanceKm == null) return -1;
    return a.distanceKm - b.distanceKm;
  });
}
