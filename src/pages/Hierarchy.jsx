import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'

const money = (n) => `R${Number(n).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const pressable = 'transition-transform duration-100 ease-out active:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none'

function buildSummary(groups, unitPriceMap) {
  const grandByItem = {}
  const groupSummaries = groups.map((g) => {
    let groupTotal = 0
    const items = (g.allocations || []).map((a) => {
      const qty = Number(a.quantity) || 0
      const key = a.itemDescription.trim().toLowerCase()
      const entry = unitPriceMap[key] || {}
      const unitPrice = Number(entry.price) || 0
      const lineTotal = qty * unitPrice
      groupTotal += lineTotal
      if (!grandByItem[a.itemDescription]) {
        grandByItem[a.itemDescription] = { totalQty: 0, unitType: a.unitType, totalAmount: 0, source: entry.source }
      }
      grandByItem[a.itemDescription].totalQty += qty
      grandByItem[a.itemDescription].totalAmount += lineTotal
      return { itemDescription: a.itemDescription, quantity: qty, unitType: a.unitType, unitPrice, lineTotal, source: entry.source }
    })
    return { groupLabel: g.groupLabel, items, groupTotal }
  })
  const grandTotal = Object.values(grandByItem).reduce((s, v) => s + v.totalAmount, 0)
  return { groupSummaries, grandByItem, grandTotal }
}

function matchSku(itemName, catalogue) {
  const needle = itemName.trim().toLowerCase()
  return (
    catalogue.find((s) => s.name.trim().toLowerCase() === needle) ||
    catalogue.find((s) => s.name.trim().toLowerCase().startsWith(needle)) ||
    catalogue.find((s) => needle.startsWith(s.name.trim().toLowerCase())) ||
    catalogue.find((s) => s.name.trim().toLowerCase().includes(needle)) ||
    catalogue.find((s) => needle.includes(s.name.trim().toLowerCase())) ||
    null
  )
}

function Hierarchy({ onBack }) {
  const { accessToken } = useAuth()
  const { showToast } = useToast()
  const [ceremonies, setCeremonies] = useState([])
  const [ceremonyId, setCeremonyId] = useState('')
  const [groups, setGroups] = useState([])
  const [error, setError] = useState('')
  const [catalogue, setCatalogue] = useState([])
  const [unitPriceMap, setUnitPriceMap] = useState({})
  const [showCalculator, setShowCalculator] = useState(false)
  const [summary, setSummary] = useState(null)
  const [addingToBasket, setAddingToBasket] = useState(false)
  const [basketAdded, setBasketAdded] = useState(false)

  const [activeGroupId, setActiveGroupId] = useState('')
  const [itemDescription, setItemDescription] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unitType, setUnitType] = useState('CASE')

  useEffect(() => {
    fetch('/api/ceremonies/my', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setCeremonies(Array.isArray(d) ? d : []))
      .catch(() => setCeremonies([]))

    fetch('/api/basket/catalogue')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setCatalogue(Array.isArray(d) ? d : []))
      .catch(() => setCatalogue([]))
  }, [accessToken])

  const applyStorePrices = useCallback((loadedGroups, cat) => {
    setUnitPriceMap((prev) => {
      const next = { ...prev }
      loadedGroups.forEach((g) => {
        (g.allocations || []).forEach((a) => {
          const key = a.itemDescription.trim().toLowerCase()
          if (next[key] && next[key].source === 'manual') return
          const sku = matchSku(a.itemDescription, cat)
          if (sku) {
            const casePrice = sku.casePriceZAR != null ? parseFloat(sku.casePriceZAR) : null
            const units = sku.unitsPerCase || 1
            if (casePrice != null) {
              const priceToUse = a.unitType === 'BOTTLE' ? casePrice / units : casePrice
              next[key] = { price: priceToUse, source: 'store', skuName: sku.name, units, skuId: sku.id }
            }
          } else if (!(key in next)) {
            next[key] = { price: '', source: 'manual' }
          }
        })
      })
      return next
    })
  }, [])

  const loadGroups = useCallback(async (id) => {
    if (!id) return
    try {
      const res = await fetch(`/api/hierarchy/${id}`, { headers: { Authorization: `Bearer ${accessToken}` } })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not load groups')
      const loaded = Array.isArray(data) ? data : []
      setGroups(loaded)
      applyStorePrices(loaded, catalogue)
    } catch (err) {
      showToast(err.message, 'error')
      setGroups([])
    }
  }, [accessToken, showToast, catalogue, applyStorePrices])

  useEffect(() => {
    if (groups.length > 0 && catalogue.length > 0) applyStorePrices(groups, catalogue)
  }, [catalogue, groups, applyStorePrices])

  useEffect(() => {
    setGroups([])
    setSummary(null)
    setShowCalculator(false)
    setBasketAdded(false)
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

  const allItemKeys = [...new Set(
    groups.flatMap((g) => (g.allocations || []).map((a) => a.itemDescription.trim().toLowerCase()))
  )]

  const storeMatchCount = allItemKeys.filter((k) => unitPriceMap[k]?.source === 'store').length

  const handleCalculate = () => {
    const result = buildSummary(groups, unitPriceMap)
    setSummary(result)
    setShowCalculator(false)
    setBasketAdded(false)
  }

  // ── Add grand total items directly to basket ───────────────
  const addAllToBasket = async () => {
    if (!summary) return
    setAddingToBasket(true)
    let added = 0
    let failed = 0

    for (const [name, data] of Object.entries(summary.grandByItem)) {
      const key = name.trim().toLowerCase()
      const entry = unitPriceMap[key]
      const skuId = entry?.skuId
      const qty = data.totalQty

      if (!skuId || qty < 1) {
        // No matched SKU — can't add to basket automatically
        failed++
        continue
      }

      try {
        const res = await fetch('/api/basket/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ skuId, quantity: qty }),
        })
        if (!res.ok) failed++
        else added++
      } catch {
        failed++
      }
    }

    setAddingToBasket(false)
    setBasketAdded(true)

    if (added > 0 && failed === 0) {
      showToast(`${added} item${added > 1 ? 's' : ''} added to your SmartMatch basket`, 'success')
    } else if (added > 0) {
      showToast(`${added} added. ${failed} item${failed > 1 ? 's' : ''} had no store match — add manually.`, 'info')
    } else {
      showToast('None of these items matched store products yet. Add them manually from SmartMatch.', 'error')
    }
  }

  return (
    <div className="px-4 pt-6 pb-24 icamagu-bg min-h-screen">
      <button onClick={onBack} className="text-sm text-brand-black/60 mb-4">
        &larr; Back
      </button>
      <h2 className="text-2xl font-extrabold text-brand-black mb-1">Umgidi Hierarchy</h2>
      <p className="text-xs text-brand-black/50 mb-4">The 14 traditional groups, and what each one needs.</p>

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
            className={`w-full bg-terracotta text-white font-bold py-2 rounded-pill disabled:opacity-50 ${pressable}`}>
            Generate the 14 Groups
          </button>
        </form>
      </div>

      {groups.length > 0 && (
        <>
          <div className="bg-white border border-terracotta/20 rounded-soft p-4 mb-4">
            <p className="text-xs font-black uppercase text-brand-black/40 mb-2">Set an allocation</p>
            <form onSubmit={addAllocation} className="space-y-2">
              <select value={activeGroupId} onChange={(e) => setActiveGroupId(e.target.value)}
                className="w-full border border-brand-black/30 rounded-soft px-3 py-2 text-sm" required>
                <option value="">Choose a group</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.groupLabel}</option>)}
              </select>
              <input type="text" placeholder="Item (e.g. Commando Brandy)" value={itemDescription}
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
              <button type="submit" className={`w-full bg-terracotta text-white font-bold py-2 rounded-pill text-sm ${pressable}`}>Add</button>
            </form>
          </div>

          <div className="space-y-2 mb-4">
            {groups.map((g) => (
              <div key={g.id} className="bg-white border-2 border-terracotta/25 rounded-soft p-3">
                <p className="font-bold text-sm text-ink">{g.groupLabel}</p>
                {(g.allocations || []).length === 0 ? (
                  <p className="text-xs text-brand-black/40">No allocation set</p>
                ) : (
                  <div className="mt-1 space-y-0.5">
                    {g.allocations.map((a) => {
                      const key = a.itemDescription.trim().toLowerCase()
                      const entry = unitPriceMap[key]
                      return (
                        <p key={a.id} className="text-xs text-brand-black/60">
                          {a.quantity} {a.unitType.toLowerCase()}(s) of {a.itemDescription}
                          {entry?.source === 'store' && (
                            <span className="ml-1.5 text-[9px] font-bold bg-sage-100 text-sage-700 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                              {money(Number(entry.price))} in-app
                            </span>
                          )}
                        </p>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          {storeMatchCount > 0 && (
            <div className="bg-sage-50 border border-sage-200 rounded-soft px-4 py-3 mb-3">
              <p className="text-xs font-black text-sage-700 mb-1">
                {storeMatchCount} item{storeMatchCount > 1 ? 's' : ''} matched to live iCamagu store prices
              </p>
              <p className="text-[10px] text-sage-600 leading-relaxed">
                These prices and bulk discounts are only available when you order through iCamagu SmartMatch. Ordering outside the app will cost more.
              </p>
            </div>
          )}

          {allItemKeys.length > 0 && (
            <div className="mb-3">
              <button
                type="button"
                onClick={() => setShowCalculator((v) => !v)}
                className={`w-full border-2 border-terracotta text-terracotta font-bold py-2.5 rounded-pill text-sm bg-white mb-2 ${pressable}`}
              >
                {showCalculator ? 'Hide price review' : 'Review & adjust prices'}
              </button>

              {showCalculator && (
                <div className="bg-white border-2 border-terracotta/25 rounded-soft p-4 space-y-3 mb-2">
                  <div>
                    <p className="text-xs font-black uppercase text-ink-muted">Price per unit (ZAR)</p>
                    <p className="text-[10px] text-ink-muted leading-relaxed mt-0.5">
                      Store prices are auto-filled. You can override any price manually.
                    </p>
                  </div>
                  {allItemKeys.map((key) => {
                    const entry = unitPriceMap[key] || {}
                    const isStore = entry.source === 'store'
                    return (
                      <div key={key} className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <label className="text-xs text-ink font-semibold flex-1 capitalize">{key}</label>
                          {isStore && (
                            <span className="text-[9px] font-bold bg-sage-100 text-sage-700 px-1.5 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0">
                              iCamagu price
                            </span>
                          )}
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted font-bold">R</span>
                          <input
                            type="number" min="0" step="0.01" placeholder="0.00"
                            value={entry.price || ''}
                            onChange={(e) =>
                              setUnitPriceMap((prev) => ({ ...prev, [key]: { ...prev[key], price: e.target.value, source: 'manual' } }))
                            }
                            className={`w-full border rounded-2xl pl-7 pr-3 py-2 text-sm focus:outline-none focus:border-terracotta/60 ${
                              isStore ? 'border-sage-200 bg-sage-50/50' : 'border-ink/20'
                            }`}
                          />
                        </div>
                        {isStore && entry.skuName && (
                          <p className="text-[10px] text-sage-600">
                            Matched to "{entry.skuName}" in store{entry.units > 1 ? ` — case price divided by ${entry.units} units` : ''}
                          </p>
                        )}
                      </div>
                    )
                  })}
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

          {summary && (
            <div className="space-y-3 mb-4">
              {summary.groupSummaries.filter((g) => g.items.length > 0).map((g) => (
                <div key={g.groupLabel} className="bg-white border border-terracotta/20 rounded-soft p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-black uppercase text-ink-muted">{g.groupLabel}</p>
                    {g.groupTotal > 0 && <p className="text-sm font-bold text-terracotta">{money(g.groupTotal)}</p>}
                  </div>
                  <div className="space-y-1">
                    {g.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-sm text-ink truncate">{item.itemDescription}</span>
                          {item.source === 'store' && (
                            <span className="text-[8px] font-bold bg-sage-100 text-sage-700 px-1 py-0.5 rounded-full uppercase flex-shrink-0">app</span>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-sm font-bold text-ink">{item.quantity} {item.unitType.toLowerCase()}(s)</span>
                          {item.unitPrice > 0 && <p className="text-[10px] text-ink-muted">{money(item.lineTotal)}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="bg-white border-2 border-terracotta rounded-soft p-4">
                <p className="text-xs font-black uppercase text-terracotta mb-3">
                  Grand Total — All {groups.length} Groups
                </p>
                <div className="space-y-2">
                  {Object.entries(summary.grandByItem).map(([name, data]) => (
                    <div key={name} className="flex items-center justify-between gap-2 border-b border-terracotta/10 pb-2 last:border-0 last:pb-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm text-ink">{name}</span>
                        {data.source === 'store' && (
                          <span className="text-[8px] font-bold bg-sage-100 text-sage-700 px-1 py-0.5 rounded-full uppercase flex-shrink-0">app price</span>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-ink">{data.totalQty} {data.unitType.toLowerCase()}(s)</p>
                        {data.totalAmount > 0 && <p className="text-xs text-terracotta font-bold">{money(data.totalAmount)}</p>}
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

                {/* ── Add all to basket ─────────────────────────────── */}
                <div className="mt-4 space-y-2">
                  <button
                    type="button"
                    onClick={addAllToBasket}
                    disabled={addingToBasket || basketAdded}
                    className={`w-full font-bold py-3 rounded-pill text-sm text-white ${pressable} ${
                      basketAdded ? 'bg-sage-500' : 'bg-terracotta'
                    }`}
                  >
                    {addingToBasket
                      ? 'Adding to basket...'
                      : basketAdded
                      ? 'Added to SmartMatch basket'
                      : 'Add all to SmartMatch basket'}
                  </button>
                  <div className="bg-sage-50 border border-sage-200 rounded-2xl px-3 py-2.5">
                    <p className="text-[10px] font-bold text-sage-700 leading-relaxed">
                      These prices and discounts are only available by ordering through iCamagu SmartMatch. Pool your order with other community members to unlock bulk supplier pricing.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Hierarchy
