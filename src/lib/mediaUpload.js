// Family archive uploads. Files go straight from the phone to photo storage
// through a one-time link from our server, so big videos never pass through
// (or time out on) the server itself. If that direct route is blocked, small
// photos fall back to being sent through the server.

export const MAX_MEDIA_BYTES = 50 * 1024 * 1024
const FALLBACK_MAX_BYTES = 8 * 1024 * 1024
const SHRINK_ABOVE_BYTES = 1.5 * 1024 * 1024
const MAX_PHOTO_SIDE = 2048

export class UploadError extends Error {
  constructor(message, reason) {
    super(message)
    this.reason = reason || null
  }
}

export const mediaTypeOf = (file) => (file.type.startsWith('video/') ? 'VIDEO' : 'PHOTO')

export function checkFile(file) {
  if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) return 'Only photos and videos can be added.'
  if (file.size > MAX_MEDIA_BYTES) return 'File too large. Max 50MB.'
  return null
}

// Phone photos are often 4–10MB; a 2048px JPEG looks the same on screen and
// uploads far faster on mobile data. Formats the browser can't draw (some
// HEIC photos) are uploaded as they are.
export async function shrinkPhoto(file) {
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.size <= SHRINK_ABOVE_BYTES) return file
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = reject
      i.src = url
    })
    const scale = Math.min(1, MAX_PHOTO_SIDE / Math.max(img.width, img.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.width * scale)
    canvas.height = Math.round(img.height * scale)
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
    if (!blob || blob.size >= file.size) return file
    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg'
    return new File([blob], name, { type: 'image/jpeg' })
  } catch {
    return file
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function postJson(path, body, accessToken) {
  let res
  try {
    res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body),
    })
  } catch {
    throw new UploadError('No connection. Check your data or Wi-Fi and try again.', 'OFFLINE')
  }
  const data = await res.json().catch(() => ({}))
  if (res.status === 401) throw new UploadError('Your session expired. Please sign in again.', 'SESSION_EXPIRED')
  if (!res.ok) throw new UploadError(data.error || 'Upload failed', data.reason)
  return data
}

// XHR (not fetch) so we can show real upload progress.
function putFile(url, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total) }
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300
      ? resolve()
      : reject(new UploadError(xhr.status === 413 ? 'That file is too large for photo storage.' : 'Upload failed', `STORAGE_${xhr.status}`)))
    xhr.onerror = () => reject(new UploadError('Upload was interrupted. Please try again.', 'DIRECT_BLOCKED'))
    xhr.send(file)
  })
}

function postThroughServer(portalId, file, mediaType, accessToken, onProgress) {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    form.append('file', file)
    form.append('portalId', portalId)
    form.append('mediaType', mediaType)
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/portals/media')
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`)
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total) }
    xhr.onload = () => {
      let data = {}
      try { data = JSON.parse(xhr.responseText) } catch { /* non-JSON error page */ }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data)
      else reject(new UploadError(data.error || 'Upload failed', data.reason || `SERVER_${xhr.status}`))
    }
    xhr.onerror = () => reject(new UploadError('No connection. Check your data or Wi-Fi and try again.', 'OFFLINE'))
    xhr.send(form)
  })
}

// Uploads one file to a portal and returns the saved media record.
export async function uploadPortalMedia({ portalId, file: original, accessToken, onProgress = () => {} }) {
  const file = await shrinkPhoto(original)
  const mediaType = mediaTypeOf(file)

  const { uploadUrl, storagePath } = await postJson('/api/portals/media/upload-url', {
    portalId, fileName: file.name, contentType: file.type, size: file.size, mediaType,
  }, accessToken)

  try {
    await putFile(uploadUrl, file, onProgress)
  } catch (err) {
    // Some networks block the storage address. Small photos can still go
    // through our own server; anything bigger reports the real problem.
    if (err.reason !== 'DIRECT_BLOCKED' || file.size > FALLBACK_MAX_BYTES) throw err
    return postThroughServer(portalId, file, mediaType, accessToken, onProgress)
  }

  return postJson('/api/portals/media/confirm', { portalId, storagePath, mediaType }, accessToken)
}
