import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'

const money = (n) => `R${Number(n).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const pressable = 'transition-transform duration-100 ease-out active:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none'

// ── Client-side calculator ─────────────────────────────────────
// Aggregates allocations across all groups into:
//   1. Per-group totals with R amounts (using unit prices keyed by item name)
//   2. A grand total per item across all groups
//   3. An overall grand total in rands
function buildSummary(groups, unitPrices) {
  // Collect grand totals per item
  const grandByItem = {}

  const groupSummaries = groups.map((g) => {
    let groupTotal = 0
    const items = (g.allocations || []).map((a) => {
      const qty = Number(a.quantity) || 0
      const key = a.itemDescription.trim().toLowerCase()
      const unitPrice = Number(unitPrices[key]) || 0
      const lineTotal = qty * unitPrice
      groupTotal += lineTotal
      // Accumulate into grand totals
      if (!grandByItem[a.itemDescription]) {
        grandByItem[a.itemDescription] = { totalQty: 0, unitType: a.unitType, totalAmount: 0 }
      }
      grandByItem[a.itemDescription].totalQty += qty
      grandByItem[a.itemDescription].totalAmount += lineTotal
      return { itemDescription: a.itemDescription, quantity: qty, unitType: a.unitType, unitPrice, lineTotal }
    })
    return { groupLabel: g.groupLabel, items, groupTotal }
  })

  const grandTotal = Object.values(grandByItem).reduce((s, v) => s + v.totalAmount, 0)

  return { groupSummaries, grandByItem, grandTotal }
}

function Hierarchy({ onBack }) {
  const { accessToken } = useAuth()
  const { showToast } = useToast()
  const [ceremonies, setCeremonies] = useState([])
  const [ceremonyId, setCeremonyId] = useState('')
  const [groups, setGroups] = useState([])
  const [error, setError] = useState('')

  // Unit prices keyed by item name (lowercased) — user fills these in
  // so the calculator can multiply qty x price and give R totals
  const [unitPrices, setUnitPrices] = useState({})
  const [showCalculator, setShowCalculator] = useState(false)
  const [summary, setSummary] = useState(null)

  const [activeGroupId, setActiveGroupId] = useState('')
  const [itemDescription, setItemDescription] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unitType, setUnitType] = useState('CASE')

  useEffect(() => {
    fetch('/api/ceremonies/my', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setCeremonies(Array.isArray(data) ? data : []))
      .catch(() => setCeremonies([]))
  }, [accessToken])

  const loadGroups = useCallback(async (id) => {
    if (!id) return
    try {
      const res = await fetch(`/api/hierarchy/${id}`, { headers: { Authorization: `Bearer ${accessToken}` } })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not load groups')
      const loaded = Array.isArray(data) ? data : []
      setGroups(loaded)
      // Pre-populate unit price keys for all unique items found in allocations
      setUnitPrices((prev) => {
        const next = { ...prev }
        loaded.forEach((g) => {
          (g.allocations || []).forEach((a) => {
            const key = a.itemDescription.trim().toLowerCase()
            if (!(key in next)) next[key] = ''
          })
        })
        return next
      })
    } catch (err) {
      showToast(err.message, 'error')
      setGroups([])
    }
  }, [accessToken, showToast])

  useEffect(() => {
    setGroups([])
    setSummary(null)
    setShowCalculator(false)
    if (ceremonyId) loadGroups(ceremonyId)
  }, [ceremonyId, loadGroups])

  const generateGroups = async (e) => {
    e.preventDefault()
    setError('')
    if (!ceremonyId) return
    try {
      const res = await fetch('/api/hierarchy/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ ceremonyId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      loadGroups(ceremonyId)
    } catch (err) {
      setError(err.message)
    }
  }

  const addAllocation = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/hierarchy/allocations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ ceremonyGroupId: activeGroupId, itemDescription, quantity, unitType }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not add allocation')
      setItemDescription(''); setQuantity('')
      loadGroups(ceremonyId)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  // Derive all unique item names across all groups for the price inputs
  const allItemKeys = [...new Set(
    groups.flatMap((g) => (g.allocations || []).map((a) => a.itemDescription.trim().toLowerCase()))
  )]

  const handleCalculate = () => {
    const result = buildSummary(groups, unitPrices)
    setSummary(result)
    setShowCalculator(false)
  }

  return (
    <div className="px-4 pt-6 pb-24 icamagu-bg min-h-screen">
      <button onClick={onBack} className="text-sm text-brand-black/60 mb-4">
        &larr; Back
      </button>
      <h2 className="text-2xl font-extrabold text-brand-black mb-1">Umgidi Hierarchy</h2>
      <p className="text-xs text-brand-black/50 mb-4">The 14 traditional groups, and what each one needs.</p>

      {/* Ceremony selector */}
      <div className="bg-white border-2 border-terracotta/25 rounded-soft p-4 mb-4 space-y-2">
        {ceremonies.length === 0 ? (
          <p className="text-xs text-brand-black/50">You don't have any ceremonies yet — create one in Ceremony Preparation first.</p>
        ) : (
          <select value={ceremonyId} onChange={(e) => setCeremonyId(e.target.value)}
            className="w-full border border-brand-black/30 rounded-soft px-3 py-2 text-sm" required>
            <option value="">Choose a ceremony</option>
            {ceremonies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} &mdash; {c.type?.replace(/_/g, ' ')} ({new Date(c.eventDate).toLocaleDateString()})
              </option>
            ))}
          </select>
        )}
        {error && <p className="text-brand-ochre text-xs">{error}</p>}
        <form onSubmit={generateGroups}>
          <button type="submit" disabled={!ceremonyId}
            className={`w-full bg-brand-blue text-brand-cream font-bold py-2 rounded-pill disabled:opacity-50 ${pressable}`}>
            Generate the 14 Groups
          </button>
        </form>
      </div>

      {groups.length > 0 && (
        <>
          {/* Add allocation */}
          <div className="bg-white border border-terracotta/20 rounded-soft p-4 mb-4">
            <p className="text-xs font-black uppercase text-brand-black/40 mb-2">Set an allocation</p>
            <form onSubmit={addAllocation} className="space-y-2">
              <select value={activeGroupId} onChange={(e) => setActiveGroupId(e.target.value)}
                className="w-full border border-brand-black/30 rounded-soft px-3 py-2 text-sm" required>
                <option value="">Choose a group</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.groupLabel}</option>)}
              </select>
              <input type="text" placeholder="Item (e.g. Brandy)" value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                className="w-full border border-brand-black/30 rounded-soft px-3 py-2 text-sm" required />
              <div className="flex gap-2">
                <input type="number" placeholder="Qty" value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-1/3 border border-brand-black/30 rounded-soft px-3 py-2 text-sm" required />
                <select value={unitType} onChange={(e) => setUnitType(e.target.value)}
                  className="flex-1 border border-brand-black/30 rounded-soft px-3 py-2 text-sm">
                  <option value="CASE">Case(s)</option>
                  <option value="BOTTLE">Bottle(s)</option>
                </select>
              </div>
              <button type="submit" className={`w-full bg-brand-ochre text-white font-bold py-2 rounded-pill text-sm ${pressable}`}>Add</button>
            </form>
          </div>

          {/* Group list */}
          <div className="space-y-2 mb-4">
            {groups.map((g) => (
              <div key={g.id} className="bg-white border-2 border-terracotta/25 rounded-soft p-3">
                <p className="font-bold text-sm text-ink">{g.groupLabel}</p>
                {(g.allocations || []).length === 0 ? (
                  <p className="text-xs text-brand-black/40">No allocation set</p>
                ) : (
                  <div className="mt-1 space-y-0.5">
                    {g.allocations.map((a) => (
                      <p key={a.id} className="text-xs text-brand-black/60">
                        {a.quantity} {a.unitType.toLowerCase()}(s) of {a.itemDescription}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Price input panel (shown before calculating) */}
          {allItemKeys.length > 0 && (
            <div className="mb-3">
              <button
                type="button"
                onClick={() => setShowCalculator((v) => !v)}
                className={`w-full border-2 border-terracotta text-terracotta font-bold py-2.5 rounded-pill text-sm bg-white mb-2 ${pressable}`}
              >
                {showCalculator ? 'Hide price inputs' : 'Enter item prices to calculate totals'}
              </button>

              {showCalculator && (
                <div className="bg-white border-2 border-terracotta/25 rounded-soft p-4 space-y-2 mb-2">
                  <p className="text-xs font-black uppercase text-ink-muted mb-1">Price per unit for each item (ZAR)</p>
                  <p className="text-[10px] text-ink-muted leading-relaxed mb-2">
                    Enter the price per bottle or case from your store or supplier. Leave blank to calculate quantities only.
                  </p>
                  {allItemKeys.map((key) => (
                    <div key={key} className="flex items-center gap-2">
                      <label className="text-xs text-ink font-semibold flex-1 capitalize">{key}</label>
                      <div className="relative w-32">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted font-bold">R</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={unitPrices[key] || ''}
                          onChange={(e) => setUnitPrices((prev) => ({ ...prev, [key]: e.target.value }))}
                          className="w-full border border-ink/20 rounded-2xl pl-7 pr-3 py-2 text-sm focus:outline-none focus:border-terracotta/60"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleCalculate}
            className={`w-full bg-terracotta text-white font-bold py-2.5 rounded-pill text-sm mb-4 ${pressable}`}
          >
            Calculate Total Shopping List
          </button>

          {/* Summary results */}
          {summary && (
            <div className="space-y-3 mb-4">

              {/* Per-group breakdown */}
              {summary.groupSummaries.filter((g) => g.items.length > 0).map((g) => (
                <div key={g.groupLabel} className="bg-white border border-terracotta/20 rounded-soft p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-black uppercase text-ink-muted">{g.groupLabel}</p>
                    {g.groupTotal > 0 && (
                      <p className="text-sm font-bold text-terracotta">{money(g.groupTotal)}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    {g.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2">
                        <span className="text-sm text-ink">{item.itemDescription}</span>
                        <div className="text-right flex-shrink-0">
                          <span className="text-sm font-bold text-ink">
                            {item.quantity} {item.unitType.toLowerCase()}(s)
                          </span>
                          {item.unitPrice > 0 && (
                            <p className="text-[10px] text-ink-muted">{money(item.lineTotal)}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Grand total per item across all groups */}
              <div className="bg-white border-2 border-terracotta rounded-soft p-4">
                <p className="text-xs font-black uppercase text-terracotta mb-3">
                  Grand Total — All {groups.length} Groups
                </p>
                <div className="space-y-2">
                  {Object.entries(summary.grandByItem).map(([name, data]) => (
                    <div key={name} className="flex items-center justify-between gap-2 border-b border-terracotta/10 pb-2 last:border-0 last:pb-0">
                      <span className="text-sm text-ink">{name}</span>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-ink">
                          {data.totalQty} {data.unitType.toLowerCase()}(s)
                        </p>
                        {data.totalAmount > 0 && (
                          <p className="text-xs text-terracotta font-bold">{money(data.totalAmount)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {summary.grandTotal > 0 && (
                  <div className="flex items-center justify-between mt-3 pt-3 border-t-2 border-terracotta/30">
                    <p className="font-black text-sm text-ink uppercase tracking-wide">Total Cost</p>
                    <p className="font-display font-extrabold text-xl text-terracotta">{money(summary.grandTotal)}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Hierarchy
