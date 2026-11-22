import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { isIos, pushStatus, turnOffPush, turnOnPush } from '../lib/push.js'

const MARK = '/images/brand/mark-green-96.png'

// Turn phone notifications on or off for this phone. Explains what to do
// when the phone cannot do it yet (iPhone not added to the Home Screen, or
// notifications blocked in settings). Hidden where the browser has no
// notifications at all.
export default function PhoneNotificationsCard({ className = '' }) {
  const { accessToken } = useAuth()
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let live = true
    pushStatus().then((s) => { if (live) setStatus(s) }).catch(() => { if (live) setStatus('unsupported') })
    return () => { live = false }
  }, [])

  if (!status || status === 'unsupported') return null

  const run = async (action) => {
    setBusy(true)
    setError('')
    try {
      setStatus(await action(accessToken))
    } catch (err) {
      setError(err?.message || 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  let title = 'Get notifications on this phone'
  let text = 'Know straight away when someone pledges, your stokvel needs your approval, or your order is ready.'
  if (status === 'on') {
    title = 'Notifications are on for this phone'
    text = 'You will hear from i-Camagu even when the app is closed.'
  } else if (status === 'needs-install') {
    text = 'On iPhone, first add i-Camagu to your Home Screen: tap Share, then "Add to Home Screen". Open it from there and turn notifications on.'
  } else if (status === 'blocked') {
    title = 'Notifications are blocked'
    text = isIos()
      ? 'Open Settings, then Notifications, then i-Camagu, and allow notifications. Then come back here.'
      : 'Allow notifications for i-Camagu in your browser or phone settings, then come back here.'
  }

  return (
    <section className={`rounded-2xl bg-white p-4 ring-1 ring-ink/[0.06] ${className}`}>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#1f3320]/[0.08]">
          <img src={MARK} alt="" width="26" height="26" className="h-[26px] w-[26px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold leading-snug text-ink">{title}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{text}</p>
          {error && <p className="mt-2 text-[13px] font-semibold text-terracotta-dark" role="alert">{error}</p>}
          {status === 'off' && (
            <button
              type="button"
              disabled={busy}
              onClick={() => run(turnOnPush)}
              className="mt-3 h-10 rounded-full bg-[#1f3320] px-5 text-[13px] font-bold text-white disabled:opacity-60"
            >
              {busy ? 'Turning on…' : 'Turn on'}
            </button>
          )}
          {status === 'on' && (
            <button
              type="button"
              disabled={busy}
              onClick={() => run(turnOffPush)}
              className="mt-2 min-h-11 text-[13px] font-semibold text-ink-muted underline disabled:opacity-60"
            >
              {busy ? 'Turning off…' : 'Turn off for this phone'}
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
