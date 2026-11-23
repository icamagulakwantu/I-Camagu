// Photos of an ID, made small enough to send and still sharp enough to read.
// A phone photo can be 4-8MB; the longest side is brought down to 1600px and
// saved as JPEG, stepping the quality down until it is under the limit. The
// server takes up to 2MB a photo; staying well under leaves room for both
// sides of a smart ID card in one upload.
export const ID_PHOTO_MAX_BYTES = 1_200_000
const LONGEST_SIDE = 1600

function bytesOf(dataUrl) {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
  return Math.floor(base64.length * 3 / 4)
}

// source: an <img>, <video> or <canvas> with its natural width and height.
export function shrinkToDataUrl(source, width, height) {
  const scale = Math.min(1, LONGEST_SIDE / Math.max(width, height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
  let quality = 0.88
  let dataUrl = canvas.toDataURL('image/jpeg', quality)
  while (bytesOf(dataUrl) > ID_PHOTO_MAX_BYTES && quality > 0.45) {
    quality -= 0.1
    dataUrl = canvas.toDataURL('image/jpeg', quality)
  }
  return dataUrl
}

// A picture chosen from the phone's gallery or files.
export function fileToIdPhoto(file) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type || 'image/')) {
      reject(new Error('Please choose a photo (JPEG or PNG).'))
      return
    }
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      try { resolve(shrinkToDataUrl(img, img.naturalWidth, img.naturalHeight)) } catch (err) { reject(err) } finally { URL.revokeObjectURL(url) }
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That photo could not be opened. Please try another.')) }
    img.src = url
  })
}

// Whether this phone or browser can show the camera inside the app.
export function canUseCamera() {
  return typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia) && (typeof window === 'undefined' || window.isSecureContext !== false)
}
