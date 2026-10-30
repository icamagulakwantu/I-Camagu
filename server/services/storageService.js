// Server-side Supabase Storage access over plain HTTP (no extra package).
// The service-role key never leaves the server: browsers only ever receive
// short-lived signed URLs for one specific file.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'ceremony-media';

// A storage failure with a short, non-secret reason code. The code is safe to
// show to users and in /api/health/storage; the message (which may contain
// Supabase's raw response) is only ever logged.
export class StorageError extends Error {
  constructor(code, message) {
    super(message || code);
    this.name = 'StorageError';
    this.code = code;
  }
}

function ensureConfigured() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new StorageError('NOT_CONFIGURED', 'Supabase Storage is not configured');
  }
}

const baseUrl = () => `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1`;

function authHeaders(extra = {}) {
  return {
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    ...extra,
  };
}

async function readError(response) {
  const text = await response.text().catch(() => '');
  try {
    const json = JSON.parse(text);
    return `${response.status} ${json.error || ''} ${json.message || ''}`.trim();
  } catch {
    return `${response.status} ${text}`.trim();
  }
}

const isRemoteUrl = (path) => path.startsWith('http://') || path.startsWith('https://');

// The bucket used to have to be created by hand in the Supabase dashboard;
// when it was missing every upload failed with no visible reason. Create it
// (private) on first use instead. Cached so it costs one request per boot.
let bucketCheck = null;

async function ensureBucketOnce() {
  ensureConfigured();
  const existing = await fetch(`${baseUrl()}/bucket/${SUPABASE_STORAGE_BUCKET}`, { headers: authHeaders() });
  if (existing.ok) return true;

  const lookupError = await readError(existing);
  if (existing.status === 401 || existing.status === 403) {
    throw new StorageError('KEY_REJECTED', lookupError);
  }

  const created = await fetch(`${baseUrl()}/bucket`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ id: SUPABASE_STORAGE_BUCKET, name: SUPABASE_STORAGE_BUCKET, public: false }),
  });
  if (created.ok) {
    console.log(`Created private storage bucket "${SUPABASE_STORAGE_BUCKET}".`);
    return true;
  }
  const createError = await readError(created);
  if (/already exists|duplicate/i.test(createError)) return true;
  if (/jws|jwt|signature|unauthori[sz]ed|invalid key/i.test(`${lookupError} ${createError}`)) {
    throw new StorageError('KEY_REJECTED', createError);
  }
  throw new StorageError('BUCKET_UNAVAILABLE', `lookup: ${lookupError}; create: ${createError}`);
}

export function ensureBucket() {
  if (!bucketCheck) {
    bucketCheck = ensureBucketOnce().catch((err) => {
      bucketCheck = null; // let the next request try again
      throw err instanceof StorageError ? err : new StorageError('STORAGE_UNREACHABLE', err?.message);
    });
  }
  return bucketCheck;
}

// Presence-only status for /api/health/storage. Never includes secrets.
export async function storageStatus() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return { configured: false, bucketReady: false, reason: 'NOT_CONFIGURED' };
  }
  try {
    await ensureBucket();
    return { configured: true, bucketReady: true, reason: null };
  } catch (err) {
    return { configured: true, bucketReady: false, reason: err.code || 'UNKNOWN' };
  }
}

// One-time URL the browser PUTs the file to directly, so photos and videos
// never pass through (or exhaust the memory of) the Render server.
export async function createSignedUploadUrl(path) {
  await ensureBucket();
  const response = await fetch(`${baseUrl()}/object/upload/sign/${SUPABASE_STORAGE_BUCKET}/${path}`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: '{}',
  });
  if (!response.ok) throw new StorageError('UPLOAD_LINK_FAILED', await readError(response));
  const data = await response.json();
  if (!data?.url) throw new StorageError('UPLOAD_LINK_FAILED', 'No url in signed upload response');
  return `${baseUrl()}${data.url}`;
}

// Fallback path: the file was sent to our server (small photos only).
export async function uploadToSupabaseStorage(file, path) {
  await ensureBucket();
  const response = await fetch(`${baseUrl()}/object/${SUPABASE_STORAGE_BUCKET}/${path}`, {
    method: 'POST',
    headers: authHeaders({
      'Content-Type': file.type || 'application/octet-stream',
      'x-upsert': 'true',
    }),
    body: Buffer.from(await file.arrayBuffer()),
  });
  if (!response.ok) {
    const message = await readError(response);
    const code = /exceeded|too large|payload/i.test(message) ? 'FILE_TOO_LARGE' : 'UPLOAD_FAILED';
    throw new StorageError(code, message);
  }
  return path;
}

export async function createSignedStorageUrl(path, expiresIn = 3600) {
  if (!path || isRemoteUrl(path)) return path;
  ensureConfigured();
  const response = await fetch(`${baseUrl()}/object/sign/${SUPABASE_STORAGE_BUCKET}/${path}`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ expiresIn }),
  });
  if (!response.ok) {
    const message = await readError(response);
    const code = /not.?found/i.test(message) ? 'FILE_NOT_FOUND' : 'SIGN_FAILED';
    throw new StorageError(code, message);
  }
  const data = await response.json();
  return `${baseUrl()}${data.signedURL}`;
}

// Signs many paths in one request. Paths that fail come back as null rather
// than breaking the whole gallery.
export async function createSignedStorageUrls(paths, expiresIn = 3600) {
  const result = new Map();
  const storagePaths = [];
  for (const path of paths) {
    if (!path) result.set(path, null);
    else if (isRemoteUrl(path)) result.set(path, path);
    else storagePaths.push(path);
  }
  if (storagePaths.length === 0) return result;
  ensureConfigured();

  const response = await fetch(`${baseUrl()}/object/sign/${SUPABASE_STORAGE_BUCKET}`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ expiresIn, paths: storagePaths }),
  });
  if (!response.ok) throw new StorageError('SIGN_FAILED', await readError(response));
  const data = await response.json();
  for (const item of Array.isArray(data) ? data : []) {
    result.set(item.path, item.signedURL && !item.error ? `${baseUrl()}${item.signedURL}` : null);
  }
  for (const path of storagePaths) if (!result.has(path)) result.set(path, null);
  return result;
}

export async function removeFromSupabaseStorage(path) {
  if (!path || isRemoteUrl(path)) return;
  ensureConfigured();
  const response = await fetch(`${baseUrl()}/object/${SUPABASE_STORAGE_BUCKET}`, {
    method: 'DELETE',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ prefixes: [path] }),
  });
  if (!response.ok) throw new StorageError('DELETE_FAILED', await readError(response));
}
