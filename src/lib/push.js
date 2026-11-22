// Phone notifications on this phone or browser.
//
// status():  'unsupported' | 'needs-install' (iPhone/iPad not added to the
//            Home Screen) | 'blocked' | 'off' | 'on'
// turnOn(token) / turnOff(token): subscribe or unsubscribe, server included.

function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export function isIos() {
  const ua = navigator.userAgent || ''
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
}

function isInstalled() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
}

function supported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

async function registration() {
  if (!('serviceWorker' in navigator)) return null
  // The app's service worker; wait a little for it on a first visit.
  const ready = navigator.serviceWorker.ready
  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), 8000))
  return Promise.race([ready, timeout])
}

export async function pushStatus() {
  if (isIos() && !isInstalled()) return 'needs-install'
  if (!supported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'blocked'
  const reg = await registration()
  if (!reg) return 'unsupported'
  const sub = await reg.pushManager.getSubscription()
  return sub && Notification.permission === 'granted' ? 'on' : 'off'
}

export async function turnOnPush(accessToken) {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'blocked' : 'off'
  const reg = await registration()
  if (!reg) throw new Error('This browser is not ready for notifications yet. Reload and try again.')
  const keyRes = await fetch('/api/push/key')
  if (!keyRes.ok) throw new Error('Notifications are not available right now. Please try again later.')
  const { publicKey } = await keyRes.json()
  let sub = await reg.pushManager.getSubscription()
  // A subscription made with an old server key has to be replaced.
  const key = urlBase64ToUint8Array(publicKey)
  const current = sub?.options?.applicationServerKey
  if (sub && current && !new Uint8Array(current).every((b, i) => b === key[i])) {
    await sub.unsubscribe()
    sub = null
  }
  if (!sub) {
    // On a poor connection the phone's push service may never answer.
    const giveUp = new Promise((_, reject) => setTimeout(() => reject(new Error('Could not reach the notification service. Check your connection and try again.')), 20000))
    sub = await Promise.race([reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }), giveUp])
  }
  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(sub.toJSON()),
  })
  if (!res.ok) throw new Error('Could not turn on notifications. Please try again.')
  return 'on'
}

export async function turnOffPush(accessToken) {
  const reg = await registration()
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) return 'off'
  if (accessToken) {
    await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    }).catch(() => {})
  }
  await sub.unsubscribe().catch(() => {})
  return 'off'
}
