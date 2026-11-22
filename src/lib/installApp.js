// "Add i-Camagu to your phone".
//
// Android and desktop Chrome offer an install prompt through the
// beforeinstallprompt event, which fires once, early, before most screens
// exist; it is caught here as soon as the app loads (main.jsx imports this
// file) and kept for the Home tile. iPhone and iPad have no such event: the
// tile shows the Share > Add to Home Screen steps instead.
import { useEffect, useState } from 'react'
import { isIos } from './push.js'

const DONE_KEY = 'icamagu_install_prompt_done'
let deferred = null
const listeners = new Set()
const notify = () => listeners.forEach((fn) => fn())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferred = event
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    try { localStorage.setItem(DONE_KEY, '1') } catch { /* storage blocked */ }
    notify()
  })
}

export function isInstalled() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
}

function isIosSafari() {
  const ua = navigator.userAgent || ''
  // Other iPhone browsers (Chrome, Firefox) cannot add to the Home Screen
  // in the same way; only offer the steps in Safari.
  return isIos() && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)
}

function wasDismissed() {
  try { return localStorage.getItem(DONE_KEY) === '1' } catch { return true }
}

// { show, kind: 'prompt' | 'ios', install(), dismiss() }
export function useInstallOffer() {
  const [, setTick] = useState(0)
  const [dismissed, setDismissed] = useState(wasDismissed)
  useEffect(() => {
    const fn = () => setTick((t) => t + 1)
    listeners.add(fn)
    return () => listeners.delete(fn)
  }, [])

  const installed = isInstalled()
  const kind = deferred ? 'prompt' : (isIosSafari() ? 'ios' : null)
  const dismiss = () => {
    try { localStorage.setItem(DONE_KEY, '1') } catch { /* storage blocked */ }
    setDismissed(true)
  }
  const install = async () => {
    if (!deferred) return false
    const event = deferred
    deferred = null
    event.prompt()
    const choice = await event.userChoice.catch(() => null)
    if (choice?.outcome === 'accepted') dismiss()
    else notify()
    return choice?.outcome === 'accepted'
  }
  return { show: !installed && !dismissed && Boolean(kind), kind, install, dismiss }
}
