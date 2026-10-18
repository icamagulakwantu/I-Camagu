import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../components/ui/Toast.jsx'
import { Skeleton } from '../../components/ui/Skeleton.jsx'
import { SubEmpty } from './Ui.jsx'
import { pressable, inp, money, api } from './shared.js'

// SmartMatchLink: turns group savings into a SmartMatch bulk order. The member
// picks catalogue items in cases, sees the total against the group balance,
// and sends them to their SmartMatch basket in one tap.
export default function SmartMatchLink({ groupBalance, memberCount }) {
  const { accessToken } = useAuth()
  const { showToast } = useToast()
  const [catalogue, setCatalogue] = useState(null)
  const [search, setSearch] = useState('')
  const [qty, setQty] = useState({})
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetch('/api/basket/catalogue')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setCatalogue(Array.isArray(d) ? d.filter((s) => s.casePriceZAR != null) : []))
      .catch(() => setCatalogue([]))
  }, [])

  const results = useMemo(() => {
    if (!catalogue) return []
    const q = search.trim().toLowerCase()
    return (q ? catalogue.filter((s) => s.name.toLowerCase().includes(q)) : catalogue).slice(0, 30)
  }, [catalogue, search])

  const picked = (catalogue || []).filter((s) => qty[s.id] > 0)
  const total = picked.reduce((sum, s) => sum + Number(s.casePriceZAR) * qty[s.id], 0)
  const perMember = memberCount > 0 ? total / memberCount : total
  const overBudget = total > groupBalance

  const change = (id, delta) => setQty((q) => ({ ...q, [id]: Math.max(0, (q[id] || 0) + delta) }))

  const sendToBasket = async () => {
    setSending(true)
    // Send all items at once instead of one after another.
    const outcomes = await Promise.allSettled(picked.map((s) =>
      api('/api/basket/items', accessToken, { method: 'POST', body: JSON.stringify({ skuId: s.id, quantity: qty[s.id] }) })))
    const added = outcomes.filter((r) => r.status === 'fulfilled').length
    const failed = outcomes.length - added
    setSending(false)
    if (added) {
      showToast(`${added} item(s) added. Open SmartMatch to check out.`, 'success')
      setQty({})
    }
    if (failed) showToast(`${failed} item(s) could not be added`, 'error')
  }

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-terracotta to-brand-ochre text-white rounded-soft p-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-white/80">Savings into buying power</p>
        <p className="text-sm mt-1">
          Use the group pot for a SmartMatch bulk order: alcohol, groceries or meat at supplier prices, not retail.
        </p>
        <p className="font-display font-bold text-2xl mt-2">{money(groupBalance)} <span className="text-xs font-sans text-white/80">available</span></p>
      </div>

      <input type="search" placeholder="Search SmartMatch (e.g. maize meal, Commando)" value={search}
        onChange={(e) => setSearch(e.target.value)} className={inp} />

      {catalogue === null ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : results.length === 0 ? (
        <SubEmpty icon="search" title={search ? 'No matches' : 'Catalogue unavailable'} description={search ? 'Try a shorter word, like the brand name.' : 'SmartMatch prices could not be loaded right now.'} />
      ) : (
        <div className="bg-white border border-terracotta/15 rounded-soft divide-y divide-cream-dark">
          {results.map((s) => (
            <div key={s.id} className="flex items-center gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-ink truncate">{s.name}</p>
                <p className="text-[11px] text-ink-muted">{money(s.casePriceZAR)} per case{s.unitsPerCase ? ` of ${s.unitsPerCase}` : ''}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button type="button" onClick={() => change(s.id, -1)} disabled={!qty[s.id]}
                  aria-label={`Remove one case of ${s.name}`} className={`w-9 h-9 rounded-full bg-ink/5 font-bold text-ink ${pressable}`}>-</button>
                <span className="w-5 text-center text-sm font-bold">{qty[s.id] || 0}</span>
                <button type="button" onClick={() => change(s.id, 1)}
                  aria-label={`Add one case of ${s.name}`} className={`w-9 h-9 rounded-full bg-sage-500 text-white font-bold ${pressable}`}>+</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {picked.length > 0 && (
        <div className="sticky bottom-20 bg-white border-2 border-terracotta rounded-soft p-4 shadow-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-ink-muted">Order total ({picked.length} item{picked.length === 1 ? '' : 's'})</span>
            <span className="font-display font-bold text-lg text-ink">{money(total)}</span>
          </div>
          <div className="flex justify-between text-xs text-ink-muted">
            <span>Per member ({memberCount})</span><span>{money(perMember)}</span>
          </div>
          {overBudget && <p className="text-xs font-bold text-terracotta">This is {money(total - groupBalance)} more than the group holds.</p>}
          <button type="button" onClick={sendToBasket} disabled={sending}
            className={`w-full bg-sage-500 text-white font-bold py-2.5 rounded-pill text-sm ${pressable}`}>
            {sending ? 'Adding...' : 'Add to SmartMatch basket'}
          </button>
        </div>
      )}
    </div>
  )
}
