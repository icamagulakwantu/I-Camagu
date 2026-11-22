import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'

const money = (n) =>
  n == null ? '—' : `R${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const day = (d) => new Date(`${d}T12:00:00`).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

// Admin only. What each weekly price check (docs/PRICE_CHECK.md) changed:
// which bulk prices dropped, which higher prices were found and left for
// the founder to decide on, and what is up for checking next.
export default function PriceCheckAdmin({ onBack }) {
  const { accessToken } = useAuth()
  const [data, setData] = useState(null)
  const [denied, setDenied] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(0)

  useEffect(() => {
    fetch('/api/basket/price-checks', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(async (res) => {
        if (res.status === 403) { setDenied(true); return }
        if (!res.ok) throw new Error('Could not load the price checks.')
        setData(await res.json())
      })
      .catch((err) => setError(err.message))
  }, [accessToken])

  if (denied) {
    return (
      <div className="min-h-screen bg-cream px-5 pt-14">
        <button type="button" onClick={onBack} className="mb-4 min-h-11 text-sm text-ink-muted">← Back</button>
        <p className="font-display text-xl font-bold text-ink">Admin only</p>
        <p className="mt-2 text-sm text-ink-muted">Price checks are only visible to an i-Camagu admin account.</p>
      </div>
    )
  }

  const runs = data?.runs || []

  return (
    <div className="min-h-screen bg-cream pb-24">
      <div className="bg-[#1f3320] px-5 pb-7 pt-12 text-white">
        <button type="button" onClick={onBack} className="mb-3 block min-h-11 text-sm text-white/70">← Back</button>
        <h1 className="font-display text-2xl font-bold">Price checks</h1>
        <p className="mt-1 text-sm text-white/70">
          Every Monday the shops’ specials are checked. Bulk prices only ever drop; a higher price found waits for you.
        </p>
      </div>

      {error && <p className="mx-4 mt-4 rounded-2xl bg-white p-4 text-sm text-terracotta-dark" role="alert">{error}</p>}

      {!data && !error ? (
        <div className="mt-4 space-y-2 px-4">
          <Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" />
        </div>
      ) : data && (
        <div className="mt-4 space-y-3 px-4">
          {runs.length === 0 && (
            <div className="rounded-2xl bg-white p-4 ring-1 ring-ink/[0.06]">
              <p className="text-[15px] font-semibold text-ink">No price check has run yet</p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">The first one runs on Monday morning. Its results show here once the app has applied it.</p>
            </div>
          )}

          {runs.map((run, i) => {
            const higher = run.higherFound || []
            const isOpen = open === i
            return (
              <section key={run.id} className="overflow-hidden rounded-2xl bg-white ring-1 ring-ink/[0.06]">
                <button type="button" onClick={() => setOpen(isOpen ? -1 : i)} aria-expanded={isOpen} className="flex w-full items-center justify-between gap-3 p-4 text-left">
                  <span>
                    <span className="block text-[15px] font-semibold text-ink">{day(run.checkedOn)}</span>
                    <span className="mt-0.5 block text-[13px] text-ink-muted">
                      {run.checked} checked · {run.loweredCount} lowered{higher.length ? ` · ${higher.length} higher found` : ''}
                    </span>
                  </span>
                  {higher.length > 0 && <span className="rounded-full bg-terracotta/10 px-2.5 py-1 text-[11px] font-bold text-terracotta-dark">Needs you</span>}
                </button>

                {isOpen && (
                  <div className="space-y-4 border-t border-ink/[0.06] p-4">
                    <Group title="Bulk price lowered" empty="Nothing was cheaper this week." rows={run.lowered} render={(r) => (
                      <><span className="font-semibold text-ink">{money(r.from)} → {money(r.found)}</span>{r.retail != null && <span className="text-ink-muted"> · shop {money(r.retail)}</span>}</>
                    )} />
                    {higher.length > 0 && (
                      <Group title="Higher price found, not applied" note="Shops now charge more than our bulk price. Raise it only if a supplier cannot match it." rows={higher} render={(r) => (
                        <span className="font-semibold text-terracotta-dark">{money(r.from)} listed, {money(r.found)} found</span>
                      )} />
                    )}
                    {(run.unchanged || []).length > 0 && (
                      <Group title="Same price" rows={run.unchanged} render={(r) => <span className="text-ink-muted">{money(r.found)}</span>} />
                    )}
                    {(run.missing || []).length > 0 && (
                      <Group title="Not in the catalogue" rows={run.missing} render={() => <span className="text-ink-muted">skipped</span>} />
                    )}
                  </div>
                )}
              </section>
            )
          })}

          {data.nextUp?.length > 0 && (
            <section className="rounded-2xl bg-white p-4 ring-1 ring-ink/[0.06]">
              <p className="text-[15px] font-semibold text-ink">Up next</p>
              <p className="mt-1 text-[13px] text-ink-muted">The products checked longest ago, first in line for Monday.</p>
              <ul className="mt-3 divide-y divide-ink/[0.06]">
                {data.nextUp.slice(0, 12).map((s) => (
                  <li key={`${s.name}|${s.bottleFormat}`} className="flex justify-between gap-3 py-2 text-[13px]">
                    <span className="min-w-0 text-ink">{s.name} <span className="text-ink-muted">· {s.bottleFormat || '—'}</span></span>
                    <span className="flex-shrink-0 text-ink-muted">{s.retailPriceCheckedAt ? new Date(s.retailPriceCheckedAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }) : 'never'}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function Group({ title, note, empty, rows = [], render }) {
  return (
    <div>
      <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#6f655a]">{title}</p>
      {note && <p className="mt-1 text-[12px] text-ink-muted">{note}</p>}
      {rows.length === 0 && empty ? <p className="mt-1 text-[13px] text-ink-muted">{empty}</p> : (
        <ul className="mt-1.5 space-y-2">
          {rows.map((r) => (
            <li key={`${r.name}|${r.bottleFormat}`} className="text-[13px] leading-snug">
              <span className="block text-ink">{r.name} <span className="text-ink-muted">· {r.bottleFormat}</span></span>
              <span className="block">{render(r)}</span>
              {r.source && <span className="block text-[12px] text-ink-muted">{r.source}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
