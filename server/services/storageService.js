const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'ceremony-media';

function ensureConfigured() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase Storage is not configured');
  }
}

export async function uploadToSupabaseStorage(file, path) {
  ensureConfigured();

  const response = await fetch(
    `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/${SUPABASE_STORAGE_BUCKET}/${path}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': file.type || 'application/octet-stream',
        'x-upsert': 'true',
      },
      body: Buffer.from(await file.arrayBuffer()),
    }
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Supabase Storage upload failed: ${message}`);
  }

  return path;
}

export async function createSignedStorageUrl(path, expiresIn = 3600) {
  if (!path || path.startsWith('http://') || path.startsWith('https://')) return path;
  ensureConfigured();

  const response = await fetch(
    `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/sign/${SUPABASE_STORAGE_BUCKET}/${path}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expiresIn }),
    }
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Supabase Storage signing failed: ${message}`);
  }

  const data = await response.json();
  return `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1${data.signedURL}`;
}

export async function removeFromSupabaseStorage(path) {
  if (!path || path.startsWith('http://') || path.startsWith('https://')) return;
  ensureConfigured();

  const response = await fetch(
    `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/${SUPABASE_STORAGE_BUCKET}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prefixes: [path] }),
    }
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Supabase Storage delete failed: ${message}`);
  }
}
