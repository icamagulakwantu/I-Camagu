import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'
import Icon from '../components/Icon.jsx'

const money = (n) =>
  n == null ? '—' : `R${Number(n).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const pressable = 'transition-transform duration-100 ease-out active:scale-[0.96] disabled:opacity-50'

// Admin-only. Shows what each product costs us against what we charge, so a
// price below cost is visible instead of silent. Cost price is never sent to
// ordinary members — the endpoints behind this screen check admin.
export default function MarginAdmin({ onBack }) {
  const { accessToken } = useAuth()
  const { showToast } = useToast()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [savingId, setSavingId] = useState(null)
  const [drafts, setDrafts] = useState({})
  const [retailDrafts, setRetailDrafts] = useState({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/basket/margins', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (res.status === 403) { setDenied(true); return }
      if (!res.ok) throw new Error('Could not load margins')
      setData(await res.json())
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [accessToken, showToast])

  useEffect(() => { load() }, [load])

  const saveCost = async (sku) => {
    const raw = drafts[sku.id]
    if (raw === undefined) return
    setSavingId(sku.id)
    try {
      const res = await fetch(`/api/basket/margins/${sku.id}/cost`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ costPriceZAR: raw === '' ? null : raw }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Could not save')
      showToast(result.warning || `Cost saved for ${sku.name}`, result.warning ? 'error' : 'success')
      setDrafts((d) => { const n = { ...d }; delete n[sku.id]; return n })
      load()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSavingId(null)
    }
  }

  // A shop price cannot be saved without saying where it came from — that is
  // the whole point of the flag. VERIFIED also demands a note naming the shop
  // and date; the server refuses it otherwise.
  const saveRetail = async (sku) => {
    const d = retailDrafts[sku.id]
    if (!d) return
    setSavingId(sku.id + ':retail')
    try {
      const res = await fetch(`/api/basket/margins/${sku.id}/retail`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          retailPriceZAR: d.price === '' ? null : d.price,
          retailPriceSource: d.source,
          retailPriceNote: d.note,
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Could not save')
      showToast(result.warning || `Shop price saved for ${sku.name}`, result.warning ? 'error' : 'success')
      setRetailDrafts((r) => { const n = { ...r }; delete n[sku.id]; return n })
      load()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSavingId(null)
    }
  }

  const rows = useMemo(() => {
    if (!data?.rows) return []
    const q = query.trim().toLowerCase()
    return data.rows.filter((r) => {
      if (q && !r.name.toLowerCase().includes(q)) return false
      if (filter === 'belowCost') return r.belowCost
      if (filter === 'aboveRetail') return r.aboveRetail
      if (filter === 'noCost') return r.costPriceZAR == null
      if (filter === 'estimated') return r.retailPriceSource === 'ESTIMATE'
      if (filter === 'unverified') return r.retailPriceZAR != null && r.retailPriceSource !== 'VERIFIED'
      return true
    })
  }, [data, filter, query])

  if (denied) {
    return (
      <div className="min-h-screen bg-cream px-5 pt-14">
        <button type="button" onClick={onBack} className="text-sm text-ink-muted mb-4">← Back</button>
        <p className="font-display font-bold text-xl text-ink">Admin only</p>
        <p className="text-sm text-ink-muted mt-2">
          Cost prices are only visible to an iCamagu admin account.
        </p>
      </div>
    )
  }

  const s = data?.summary

  return (
    <div className="min-h-screen pb-24 bg-cream">
      <div className="bg-ink text-white px-5 pt-12 pb-7">
        <button type="button" onClick={onBack} className="text-sm text-white/70 mb-3 block">← Back</button>
        <h1 className="font-display font-bold text-2xl">Cost &amp; Margin</h1>
        <p className="text-white/70 text-sm mt-1">
          What we pay against what we charge. Only you can see this.
        </p>
      </div>

      {loading ? (
        <div className="px-4 mt-4 space-y-2">
          <Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <>
          {s && (
            <div className="grid grid-cols-4 gap-2 px-4 -mt-4">
              <Stat n={s.withCost} of={s.total} label="Have a cost" tone="ink" />
              <Stat n={s.retailVerified} of={s.total} label="Shop price checked" tone="ink" />
              <Stat n={s.belowCost} label="Below cost" tone={s.belowCost > 0 ? 'bad' : 'good'} />
              <Stat n={s.aboveRetail} label="Above retail" tone={s.aboveRetail > 0 ? 'bad' : 'good'} />
            </div>
          )}

          <div className="px-4 mt-4 space-y-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full h-11 border-2 border-cream-dark rounded-pill px-4 text-sm bg-white focus:outline-none focus:border-terracotta"
            />
            <div className="flex gap-2 overflow-x-auto pb-1">
              {[['all', 'All'], ['noCost', 'No cost yet'], ['belowCost', 'Below cost'], ['aboveRetail', 'Above retail'], ['estimated', 'Estimated shop price']].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setFilter(id)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-pill text-[11px] font-bold transition-colors ${
                    filter === id ? 'bg-ink text-white' : 'bg-white border border-ink/10 text-ink-muted'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <p className="px-5 mt-3 text-xs text-ink-muted">{rows.length} product{rows.length === 1 ? '' : 's'}</p>

          <div className="px-4 mt-2 space-y-2">
            {rows.map((r) => {
              const draft = drafts[r.id]
              const dirty = draft !== undefined
              return (
                <div
                  key={r.id}
                  className={`bg-white rounded-soft p-4 border-2 ${
                    r.belowCost ? 'border-terracotta' : r.aboveRetail ? 'border-brand-ochre' : 'border-cream-dark'
                  }`}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-ink">{r.name}</p>
                      <p className="text-[11px] text-ink-muted">
                        {r.bottleFormat ? `${r.bottleFormat} · ` : ''}{r.unitsPerCase} per {r.bulkUnit}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[10px] uppercase tracking-wide text-ink-muted">We charge</p>
                      <p className="font-display font-bold text-sm text-ink tabular">{money(r.casePriceZAR)}</p>
                    </div>
                  </div>

                  <div className="flex items-end gap-2 mt-3">
                    <div className="flex-1">
                      <label className="text-[10px] uppercase tracking-wide text-ink-muted block mb-1">
                        We pay (per {r.bulkUnit})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        value={dirty ? draft : (r.costPriceZAR ?? '')}
                        onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
                        placeholder="Not set"
                        className="w-full h-10 border-2 border-cream-dark rounded-soft px-3 text-sm tabular focus:outline-none focus:border-terracotta"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => saveCost(r)}
                      disabled={!dirty || savingId === r.id}
                      className={`h-10 px-4 rounded-pill text-xs font-bold text-white bg-ink ${pressable}`}
                    >
                      {savingId === r.id ? '...' : 'Save'}
                    </button>
                  </div>

                  <div className="flex gap-4 mt-3 pt-3 border-t border-cream-dark/60 text-xs">
                    <Field label="Margin" value={money(r.marginPerCase)}
                           tone={r.marginPerCase == null ? 'muted' : r.marginPerCase < 0 ? 'bad' : 'good'} />
                    <Field label="Per unit" value={money(r.marginPerUnit)}
                           tone={r.marginPerUnit == null ? 'muted' : r.marginPerUnit < 0 ? 'bad' : 'good'} />
                    <Field label="Shop price" value={money(r.retailPriceZAR)}
                           tone={r.retailPriceSource === 'VERIFIED' ? 'good' : 'muted'} />
                  </div>

                  <RetailEditor
                    row={r}
                    draft={retailDrafts[r.id]}
                    onChange={(patch) =>
                      setRetailDrafts((d) => ({
                        ...d,
                        [r.id]: {
                          price: r.retailPriceZAR ?? '',
                          source: r.retailPriceSource || 'ESTIMATE',
                          note: r.retailPriceNote || '',
                          ...d[r.id],
                          ...patch,
                        },
                      }))
                    }
                    onSave={() => saveRetail(r)}
                    saving={savingId === r.id + ':retail'}
                  />

                  {r.belowCost && (
                    <p className="text-[11px] font-bold text-terracotta mt-2">
                      Selling below cost — losing {money(Math.abs(r.marginPerCase))} every {r.bulkUnit}.
                    </p>
                  )}
                  {!r.belowCost && r.aboveRetail && (
                    <p className="text-[11px] font-bold text-brand-ochre mt-2">
                      We charge more than the shop does. A member who checks will find that out.
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// The shop price and its provenance, together. They are edited as one thing
// because a price without a source is exactly what we are trying to prevent —
// splitting them into separate controls would invite saving one without the
// other.
function RetailEditor({ row, draft, onChange, onSave, saving }) {
  const d = draft || {
    price: row.retailPriceZAR ?? '',
    source: row.retailPriceSource || 'ESTIMATE',
    note: row.retailPriceNote || '',
  }
  const dirty = draft !== undefined
  const verified = d.source === 'VERIFIED'
  const needsNote = verified && !String(d.note || '').trim()

  return (
    <div className="mt-3 pt-3 border-t border-cream-dark/60">
      <div className="flex items-center justify-between gap-2 mb-2">
        <label className="text-[10px] uppercase tracking-wide text-ink-muted">Shop charges</label>
        {row.retailPriceZAR != null && (
          <span className={`text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-pill ${
            row.retailPriceSource === 'VERIFIED'
              ? 'bg-sage-100 text-sage-700'
              : 'bg-brand-ochre/15 text-brand-ochre'
          }`}>
            {row.retailPriceSource === 'VERIFIED' ? 'Checked' : 'Estimate — hidden from members'}
          </span>
        )}
      </div>

      <div className="flex items-end gap-2">
        <input
          type="number" step="0.01" inputMode="decimal"
          value={d.price}
          onChange={(e) => onChange({ price: e.target.value })}
          placeholder="Not set"
          className="flex-1 h-10 border-2 border-cream-dark rounded-soft px-3 text-sm tabular focus:outline-none focus:border-terracotta"
        />
        <div className="flex rounded-pill border-2 border-cream-dark overflow-hidden flex-shrink-0">
          {[['ESTIMATE', 'Estimate'], ['VERIFIED', 'Checked']].map(([id, label]) => (
            <button
              key={id} type="button" onClick={() => onChange({ source: id })}
              className={`px-3 h-[36px] text-[11px] font-bold transition-colors ${
                d.source === id ? 'bg-ink text-white' : 'bg-white text-ink-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <input
        type="text"
        value={d.note}
        onChange={(e) => onChange({ note: e.target.value })}
        placeholder={verified ? 'Which shop, and when? e.g. Jumbo Grahamstown Rd, 10 Sep' : 'Where this came from (optional)'}
        className={`w-full h-10 mt-2 border-2 rounded-soft px-3 text-xs focus:outline-none focus:border-terracotta ${
          needsNote ? 'border-terracotta' : 'border-cream-dark'
        }`}
      />

      <div className="flex items-center gap-2 mt-2">
        <button
          type="button" onClick={onSave} disabled={!dirty || saving || needsNote}
          className={`h-9 px-4 rounded-pill text-xs font-bold text-white bg-ink ${pressable}`}
        >
          {saving ? '...' : 'Save shop price'}
        </button>
        <p className="text-[10px] text-ink-muted leading-tight">
          {needsNote
            ? 'A checked price needs the shop and date — that note is the evidence.'
            : verified
              ? 'Members will see this and the saving against it.'
              : 'Used for margin only. Members are shown no shop price.'}
        </p>
      </div>
    </div>
  )
}

function Stat({ n, of, label, tone }) {
  const colour = tone === 'bad' ? 'text-terracotta' : tone === 'good' ? 'text-sage-600' : 'text-ink'
  return (
    <div className="bg-white border border-cream-dark rounded-soft p-3 text-center">
      <p className={`font-display font-bold text-lg ${colour} tabular`}>
        {n}{of != null && <span className="text-ink-muted text-xs">/{of}</span>}
      </p>
      <p className="text-[9px] font-bold text-ink-muted uppercase tracking-wide mt-0.5 leading-tight">{label}</p>
    </div>
  )
}

function Field({ label, value, tone }) {
  const colour = tone === 'bad' ? 'text-terracotta' : tone === 'good' ? 'text-sage-600' : 'text-ink-muted'
  return (
    <div>
      <p className="text-[9px] uppercase tracking-wide text-ink-muted">{label}</p>
      <p className={`font-bold tabular ${colour}`}>{value}</p>
    </div>
  )
}
