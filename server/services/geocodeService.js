// Address lookup for checkout — OpenStreetMap's free Nominatim service, so no
// API key is needed. Their usage policy asks for a real User-Agent and at most
// one request a second, so requests are queued and results cached.
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'iCamagu/1.0 (icamagulakwantu@gmail.com)';
const CACHE_LIMIT = 500;
const MIN_GAP_MS = 1100;

const cache = new Map();
let queue = Promise.resolve();
let lastCallAt = 0;

function remember(key, value) {
  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value);
  cache.set(key, value);
  return value;
}

function throttled(task) {
  const run = queue.then(async () => {
    const wait = lastCallAt + MIN_GAP_MS - Date.now();
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastCallAt = Date.now();
    return task();
  });
  queue = run.catch(() => {});
  return run;
}

async function callNominatim(path, params) {
  const url = `${NOMINATIM_URL}/${path}?${new URLSearchParams({ format: 'jsonv2', addressdetails: '1', ...params })}`;
  const res = await throttled(() => fetch(url, {
    headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en' },
    signal: AbortSignal.timeout(6000),
  }));
  if (!res.ok) throw new Error(`Address lookup failed (${res.status})`);
  return res.json();
}

function toSuggestion(place) {
  const a = place?.address || {};
  const street = [a.house_number, a.road].filter(Boolean).join(' ');
  const area = a.suburb || a.neighbourhood || a.township || a.village || a.town || a.city_district || a.city || '';
  const city = a.city || a.town || a.municipality || a.county || '';
  const label = [street, area, city !== area ? city : '', a.state].filter(Boolean).join(', ');
  return {
    label: label || place.display_name,
    address: label || place.display_name,
    area,
    city,
    latitude: Number(place.lat),
    longitude: Number(place.lon),
  };
}

export async function searchAddresses(query) {
  const q = String(query || '').trim().slice(0, 200);
  if (q.length < 3) return [];
  const key = `s:${q.toLocaleLowerCase()}`;
  if (cache.has(key)) return cache.get(key);
  const places = await callNominatim('search', { q, countrycodes: 'za', limit: '5' });
  const seen = new Set();
  const suggestions = (Array.isArray(places) ? places : []).map(toSuggestion)
    .filter((s) => Number.isFinite(s.latitude) && !seen.has(s.label) && seen.add(s.label));
  return remember(key, suggestions);
}

export async function reverseLookup(latitude, longitude) {
  const key = `r:${latitude.toFixed(4)},${longitude.toFixed(4)}`;
  if (cache.has(key)) return cache.get(key);
  const place = await callNominatim('reverse', { lat: String(latitude), lon: String(longitude), zoom: '18' });
  const suggestion = place && !place.error ? { ...toSuggestion(place), latitude, longitude } : null;
  return remember(key, suggestion);
}
