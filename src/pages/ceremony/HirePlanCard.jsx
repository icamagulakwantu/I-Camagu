import { useMemo, useState } from 'react'
import Icon from '../../components/Icon.jsx'
import { hirePlan } from '../../../shared/hire.js'
import { darkness } from '../../../shared/darkness.js'
import { useT } from '../../i18n/index.jsx'

const rand = (n) => `R${Math.round(n).toLocaleString('en-ZA')}`
const range = (i, t) => (i.upcoming ? t('Price coming soon') : i.from ? `from ${rand(i.low)}` : i.low === i.high ? rand(i.low) : `${rand(i.low)}–${rand(i.high)}`)

// What to hire (founder, 23 Nov 2026: in our days everything is hired).
// Shown as its own card, not dropped into the checklist: the family sees
// what a ceremony this size usually hires, from whom and for roughly how
// much, ticks what it needs, and only then adds it to the budget as its
// own stage. Prices are ranges from the hire companies' published lists.
export default function HirePlanCard({ ceremony, accessToken, showToast, onAdded }) {
  const t = useT()
  const plan = useMemo(() => hirePlan(ceremony?.guestCount || 150), [ceremony?.guestCount])
  // The day the guests are there: for ulwaluko that is umgidi.
  const day = ceremony?.homecomingDate || ceremony?.eventDate
  const dark = useMemo(() => darkness(day), [day])
  const [open, setOpen] = useState(false)
  const [chosen, setChosen] = useState(() => new Set(plan.items.filter((i) => !i.optional).map((i) => i.id)))
  const [busy, setBusy] = useState(false)

  const toggle = (id) => setChosen((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })
  const picked = plan.items.filter((i) => chosen.has(i.id))
  const low = picked.reduce((s, i) => s + i.low, 0)
  const high = picked.reduce((s, i) => s + i.high, 0)

  const add = async () => {
    if (!ceremony?.id || !picked.length) return
    setBusy(true)
    try {
      const res = await fetch(`/api/ceremonies/${ceremony.id}/hire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ items: picked.map((i) => i.id) }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || t('Could not save. Please try again.'))
      showToast?.(data.added ? t('{n} hire items added to your budget', { n: data.added }) : t('These are already on your plan'), 'success')
      setOpen(false)
      onAdded?.()
    } catch (err) {
      showToast?.(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="hire-title" className="rounded-[22px] bg-[#fffdf9] p-4 ring-1 ring-ink/[0.07] shadow-[0_16px_32px_-26px_rgba(43,30,18,0.55)]">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center gap-3 text-left">
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#1f3320] text-cream"><Icon name="package" size={18} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#6f655a]">{t('Tent, benches, fridge, lights')}</span>
          <span id="hire-title" className="block font-display text-[1.15rem] font-semibold leading-tight text-ink">{t('What to hire')}</span>
          <span className="block text-[13px] text-ink-muted">{t('For {n} guests: about {low}–{high}', { n: plan.guests, low: rand(plan.usualLow), high: rand(plan.usualHigh) })}</span>
        </span>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} color="#6f655a" />
      </button>

      {open && (
        <div className="mt-3">
          <ul className="divide-y divide-ink/[0.06]">
            {plan.items.map((item) => {
              const on = chosen.has(item.id)
              return (
                <li key={item.id}>
                  <label className="flex cursor-pointer items-start gap-3 py-3">
                    <input type="checkbox" checked={on} onChange={() => toggle(item.id)} className="mt-1 h-5 w-5 flex-shrink-0 accent-[#1f3320]" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="text-[14px] font-semibold leading-snug text-ink">
                          {item.tents > 1 ? t('{n} tents with chairs and tables', { n: item.tents }) : t(item.label)}
                          {item.qty > 1 && item.id !== 'tent_bundle' ? <span className="font-normal text-ink-muted"> × {item.qty}</span> : null}
                        </span>
                        <span className={`flex-shrink-0 text-[13px] font-bold tabular-nums ${item.upcoming ? 'rounded-full bg-[#b8860b]/10 px-2 py-0.5 text-[#8a6508]' : 'text-ink'}`}>{range(item, t)}</span>
                      </span>
                      <span className="mt-0.5 block text-[12px] leading-snug text-ink-muted">{t(item.why)}</span>
                      {item.upcomingNote && <span className="mt-0.5 block text-[12px] font-semibold text-[#8a6508]">{t(item.upcomingNote)}</span>}
                      {item.night && dark && (
                        <span className="mt-1 block rounded-lg bg-[#1f3320]/[0.06] px-2 py-1 text-[12px] font-semibold text-[#2e4a2e]">
                          {t('On your day the sun sets at about {sunset} and it is dark by {dark}.', dark)}
                        </span>
                      )}
                      {item.vendors.map((v, n) => (
                        <span key={v.name} className={`mt-0.5 block text-[12px] ${n === 0 ? 'font-semibold text-[#2e4a2e]' : 'text-ink-muted'}`}>
                          {n === 1 ? `${t('Also')}: ` : ''}{v.name} · {v.contact}{v.area ? ` · ${t(v.area)}` : ''}
                        </span>
                      ))}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
          <p className="mt-2 text-[12px] leading-relaxed text-ink-muted">
            {t('Prices are ranges from the hirers’ own price lists and adverts (Gqeberha, 2025–26); delivery and gas may be extra. Ask two for a quote before you book.')}
          </p>
          <button type="button" disabled={busy || !picked.length} onClick={add} className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-terracotta-dark text-[14px] font-bold text-white disabled:opacity-50">
            {busy ? t('Adding…') : t('Add to my budget · about {low}–{high}', { low: rand(low), high: rand(high) })}
          </button>
        </div>
      )}
    </section>
  )
}
