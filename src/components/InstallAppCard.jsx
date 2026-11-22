import { useState } from 'react'
import Icon from './Icon.jsx'
import { useT } from '../i18n/index.jsx'

// "Add i-Camagu to your phone": shown once on Home (see useInstallOffer).
// Android/desktop: the phone's own install prompt. iPhone: the three steps
// in Safari, because Apple offers no install button to websites, and a
// phone notification can only reach an iPhone once the app is on the Home
// Screen.
export default function InstallAppCard({ offer, className = '' }) {
  const [busy, setBusy] = useState(false)
  const t = useT()
  if (!offer?.show) return null
  const ios = offer.kind === 'ios'

  const install = async () => {
    setBusy(true)
    try { await offer.install() } finally { setBusy(false) }
  }

  return (
    <section className={`rounded-2xl bg-white p-4 ring-1 ring-ink/[0.06] ${className}`} aria-label="Add i-Camagu to your phone">
      <div className="flex items-start gap-3">
        <img src="/images/brand/icon-128.png?v=3" alt="" width="40" height="40" className="h-10 w-10 flex-shrink-0 rounded-[11px]" />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold leading-snug text-ink">{t('Add i-Camagu to your phone')}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
            {ios ? t('Open it from your home screen like any app, and get notifications on your iPhone.') : t('Open it from your home screen like any app, even on a slow connection.')}
          </p>
          {ios && (
            <ol className="mt-3 space-y-2 text-[13px] text-ink">
              <li className="flex items-center gap-2">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#1f3320]/[0.08] text-[12px] font-bold text-[#1f3320]">1</span>
                <span>{t('Tap')} <span className="inline-flex translate-y-[3px] items-center" aria-label="Share"><ShareGlyph /></span> <b>Share</b> {t('at the bottom of Safari')}</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#1f3320]/[0.08] text-[12px] font-bold text-[#1f3320]">2</span>
                <span>{t('Choose')} <b>Add to Home Screen</b></span>
              </li>
              <li className="flex items-center gap-2">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#1f3320]/[0.08] text-[12px] font-bold text-[#1f3320]">3</span>
                <span>{t('Open i-Camagu from your Home Screen')}</span>
              </li>
            </ol>
          )}
          <div className="mt-3 flex items-center gap-2">
            {!ios && (
              <button
                type="button"
                disabled={busy}
                onClick={install}
                className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#1f3320] px-5 text-[13px] font-bold text-white disabled:opacity-60"
              >
                <Icon name="plus" size={15} color="#fff" /> {t('Add to phone')}
              </button>
            )}
            <button type="button" onClick={offer.dismiss} className="min-h-11 px-3 text-[13px] font-semibold text-ink-muted">
              {ios ? t('Got it') : t('Not now')}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

// The iOS share symbol: a box with an arrow pointing up.
function ShareGlyph() {
  return (
    <svg width="16" height="18" viewBox="0 0 16 18" fill="none" stroke="#1f3320" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 11V1.5M4.8 4.6L8 1.4l3.2 3.2" />
      <path d="M5.5 7H3.5a1.5 1.5 0 00-1.5 1.5v7A1.5 1.5 0 003.5 17h9a1.5 1.5 0 001.5-1.5v-7A1.5 1.5 0 0012.5 7h-2" />
    </svg>
  )
}
