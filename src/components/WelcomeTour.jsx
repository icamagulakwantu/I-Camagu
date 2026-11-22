import { useEffect, useRef, useState } from 'react'
import Icon from './Icon.jsx'

// The first-visit tour: i-Camagu as one vehicle (docs/VISION.md). Your
// ceremony, your clan, your saving and your buying, each step saying how it
// leads to the next. Shown once on Home to a new member; "Take the tour" in
// More shows it again.
export const TOUR_REQUEST_KEY = 'icamagu_tour_requested'
export const tourDoneKey = (userId) => `icamagu_tour_done:${userId}`

const STEPS = [
  {
    eyebrow: 'Wamkelekile · Welcome',
    title: 'One place for your family’s life',
    body: 'i-Camagu brings together your ceremonies, your clan, your saving and your buying. Each part helps the others, so nothing is planned alone.',
    mark: true,
  },
  {
    eyebrow: 'Imisitho · Ceremonies',
    title: 'Plan every ceremony, step by step',
    body: 'Imbeleko, ulwaluko and umgidi, umtshato and more: what to do and when, what to buy, and what it costs. Family can help plan, and nothing changes without your approval. Your ukugida book is kept with it.',
    icon: 'calendar',
    screen: 'ceremonyhub',
    tab: 'Ceremonies',
  },
  {
    eyebrow: 'Isiduko · Your clan',
    title: 'Your isiduko is your root',
    body: 'Find your people through your clan names. Your clan can see your ceremony and say "I’m coming", so you know who to plan for.',
    icon: 'users',
    screen: 'iziduko',
    tab: 'Iziduko',
  },
  {
    eyebrow: 'Iistokvel · Saving together',
    title: 'Save with your stokvel',
    body: 'Umgalelo, burial society, grocery or family saving: track who paid and pay out fairly. Link a stokvel to a ceremony and see what it is saving for.',
    icon: 'coins',
    screen: 'stokvels',
    tab: 'Stokvels',
  },
  {
    eyebrow: 'Thengani kunye · Bulk Buy',
    title: 'Buy together, pay less',
    body: 'SmartMatch joins what you need with what many other families and stokvels need, into one big order at the bulk price. You pay only once the group reaches its bulk tier.',
    icon: 'cart',
    screen: 'store',
    tab: 'Bulk Buy',
  },
]

export default function WelcomeTour({ onClose, onNavigate }) {
  const [step, setStep] = useState(0)
  const nextRef = useRef(null)
  const current = STEPS[step]
  const last = step === STEPS.length - 1

  useEffect(() => { nextRef.current?.focus() }, [step])
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const open = (screen) => { onClose(); onNavigate?.(screen) }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#1f3320]/55 p-3 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="welcome-tour-title">
      <div className="w-full max-w-md rounded-[28px] bg-[#fffdf9] p-5 shadow-[0_24px_60px_-20px_rgba(20,30,20,0.6)]">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex gap-1.5" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
            {STEPS.map((s, i) => (
              <span key={s.eyebrow} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-[#1f3320]' : i < step ? 'w-1.5 bg-[#1f3320]/50' : 'w-1.5 bg-ink/15'}`} />
            ))}
          </div>
          <button type="button" onClick={onClose} className="min-h-11 px-2 text-[13px] font-semibold text-ink-muted">Skip</button>
        </div>

        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1f3320]/[0.07]">
          {current.mark
            ? <img src="/images/brand/mark-green-96.png" alt="" width="34" height="34" className="h-[34px] w-[34px]" />
            : <Icon name={current.icon} size={26} color="#1f3320" />}
        </span>
        <p className="mt-4 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#6f655a]">{current.eyebrow}</p>
        <h2 id="welcome-tour-title" className="mt-1 font-display text-[24px] font-bold leading-tight text-ink">{current.title}</h2>
        <p className="mt-2 min-h-[110px] text-[15px] leading-relaxed text-ink-muted">{current.body}</p>

        {current.screen && (
          <button type="button" onClick={() => open(current.screen)} className="min-h-11 text-[13px] font-bold text-[#1f3320] underline underline-offset-4">
            Open {current.tab} →
          </button>
        )}

        <div className="mt-4 flex gap-2">
          {step > 0 && (
            <button type="button" onClick={() => setStep(step - 1)} className="h-12 flex-1 rounded-full border border-ink/15 text-[15px] font-bold text-ink">
              Back
            </button>
          )}
          {last ? (
            <button ref={nextRef} type="button" onClick={() => open('ceremonyhub')} className="h-12 flex-[2] rounded-full bg-terracotta-dark text-[15px] font-bold text-white">
              Start with a ceremony
            </button>
          ) : (
            <button ref={nextRef} type="button" onClick={() => setStep(step + 1)} className="h-12 flex-[2] rounded-full bg-[#1f3320] text-[15px] font-bold text-white">
              {step === 0 ? 'Show me' : 'Next'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
