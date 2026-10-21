import { useState, useEffect, useCallback } from 'react'
import { useToast } from '../../components/ui/Toast.jsx'
import { Skeleton } from '../../components/ui/Skeleton.jsx'
import Icon from '../../components/Icon.jsx'
import ScrollableLabel from '../../components/ScrollableLabel.jsx'
import { cn } from '../../lib/utils'
import {
  summariseCosts, hasActual, suggestedTotal, suggestedUnitCost, UNFORESEEN_PHASE,
} from '../../../shared/ceremonyCosts.js'

const pressable = 'transition-transform duration-100 ease-out active:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none'
const rand = (n) => `R${Number(n || 0).toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`
const randExact = (n) => `R${Number(n || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const PHASE_OPTIONS = [
  { value: 'CUSTOM', label: 'Custom' },
  { value: 'FOOD', label: 'Food' },
  { value: 'FAMILY', label: 'Family' },
  { value: 'LOGISTICS', label: 'Logistics' },
  { value: 'SEATING', label: 'Seating' },
  { value: 'SPEAKERS', label: 'Speakers' },
  { value: UNFORESEEN_PHASE, label: 'Unforeseen expense' },
]

const EMPTY_FORM = { phase: 'CUSTOM', label: '', isOptional: true, actual: '' }

async function request(path, accessToken, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}`, ...(options.headers || {}) },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Something went wrong')
  return data
}

// One tab for the whole ceremony money picture. The app only SUGGESTS prices;
// the host enters what they really paid, and only those real amounts come off
// the budget. Anything not planned for (a hired tent, extra ice) is added as an
// unforeseen expense and counts the same way, so the total shows exactly what
// the ceremony cost.
export default function CostsTab({
  ceremonyId, accessToken, budgetZAR, legacyItems = [], totalPledged = 0, pledgeCount = 0,
  onEditBudget, onViewPledges, onItemsChanged,
}) {
  const { showToast } = useToast()
  const [costItems, setCostItems] = useState([])
  const [checklistItems, setChecklistItems] = useState(legacyItems)
  const [loading, setLoading] = useState(Boolean(ceremonyId))
  const [form, setForm] = useState(EMPTY_FORM)
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    if (!ceremonyId) return
    try {
      const data = await request(`/api/ceremonies/${ceremonyId}/costs`, accessToken)
      setCostItems(data.costItems || [])
      setChecklistItems(data.checklistItems || [])
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [ceremonyId, accessToken, showToast])

  useEffect(() => { load() }, [load])

  // Keep the rest of the planner (progress bar, overview) in step.
  const commit = (nextCosts, nextChecklist) => {
    setCostItems(nextCosts)
    setChecklistItems(nextChecklist)
    onItemsChanged?.({ costItems: nextCosts, checklistItems: nextChecklist })
  }

  const summary = summariseCosts({ budgetZAR, costItems, checklistItems })
  const pledgeShortfall = budgetZAR != null ? Math.max(0, Number(budgetZAR) - totalPledged) : null
  const budgetPercent = budgetZAR ? Math.min(100, Math.round((summary.spent / Number(budgetZAR)) * 100)) : 0

  const toggleBought = async (item) => {
    try {
      const nowBought = !item.isPurchased
      await request(`/api/ceremonies/cost/${item.id}`, accessToken, { method: 'PATCH', body: JSON.stringify({ isPurchased: nowBought }) })
      // Un-ticking also clears the price, so nothing stays deducted for something not bought.
      if (!nowBought && hasActual(item)) {
        await request(`/api/ceremonies/cost/${item.id}/actual`, accessToken, { method: 'PATCH', body: JSON.stringify({ actualCostZAR: null }) })
      }
      commit(costItems.map((c) => (c.id === item.id ? { ...c, isPurchased: nowBought, actualCostZAR: nowBought ? c.actualCostZAR : null } : c)), checklistItems)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const saveProvisionPrice = async (item, value) => {
    const parsed = value === '' ? null : parseFloat(value)
    if (parsed === (item.actualCostZAR ?? null)) return
    try {
      const data = await request(`/api/ceremonies/cost/${item.id}/actual`, accessToken, { method: 'PATCH', body: JSON.stringify({ actualCostZAR: value === '' ? null : value }) })
      commit(costItems.map((c) => (c.id === item.id ? { ...c, actualCostZAR: data.actualCostZAR, isPurchased: data.actualCostZAR !== null ? true : c.isPurchased } : c)), checklistItems)
      showToast(data.actualCostZAR === null ? 'Price cleared' : 'Price saved', 'success')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const toggleTask = async (item) => {
    try {
      const endpoint = item.ceremonyId
        ? `/api/ceremonies/ceremony-checklist/${item.id}/toggle`
        : `/api/ceremonies/plans/items/${item.id}/toggle`
      const data = await request(endpoint, accessToken, { method: 'PATCH' })
      commit(costItems, checklistItems.map((i) => (i.id === item.id ? data : i)))
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const saveTaskPrice = async (item, value) => {
    const parsed = value === '' ? null : parseFloat(value)
    const current = item.actualCostZAR != null ? parseFloat(item.actualCostZAR) : null
    if (parsed === current) return
    try {
      const endpoint = item.ceremonyId ? `/api/ceremonies/checklist/${item.id}` : `/api/ceremonies/plans/items/${item.id}/cost`
      const data = await request(endpoint, accessToken, { method: 'PATCH', body: JSON.stringify({ actualCostZAR: value === '' ? null : parsed }) })
      commit(costItems, checklistItems.map((i) => (i.id === item.id ? data : i)))
      showToast('Amount saved', 'success')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const buyItem = async (item) => {
    if (!item.skuId) return
    try {
      const data = await request('/api/basket/items', accessToken, {
        method: 'POST',
        body: JSON.stringify({ skuId: item.skuId, quantity: Math.max(1, Math.ceil(item.quantity || 1)) }),
      })
      showToast(data.message || 'Added to basket', 'success')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const addItem = async (e) => {
    e.preventDefault()
    if (!form.label.trim() || !ceremonyId) return
    setAdding(true)
    try {
      const unforeseen = form.phase === UNFORESEEN_PHASE
      const data = await request(`/api/ceremonies/${ceremonyId}/checklist`, accessToken, {
        method: 'POST',
        body: JSON.stringify({
          phase: form.phase,
          label: form.label,
          isOptional: unforeseen ? false : form.isOptional,
          actualCostZAR: form.actual === '' ? null : parseFloat(form.actual),
        }),
      })
      commit(costItems, [...checklistItems, data])
      setForm(EMPTY_FORM)
      showToast(unforeseen ? 'Unforeseen expense added to your costs' : 'Item added', 'success')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setAdding(false)
    }
  }

  if (loading) return <div className="mx-4 mt-4 space-y-2"><Skeleton className="h-32 w-full" /><Skeleton className="h-24 w-full" /></div>

  const unforeseenItems = checklistItems.filter((i) => i.phase === UNFORESEEN_PHASE)
  const taskItems = checklistItems.filter((i) => i.phase !== UNFORESEEN_PHASE)
  const tasksLogged = taskItems.filter(hasActual).reduce((sum, i) => sum + parseFloat(i.actualCostZAR), 0)
  const unforeseenIsUsed = unforeseenItems.length > 0
  const isPaidProvision = (item) => item.isPurchased || hasActual(item)

  return (
    <>
      {/* Budget: only real, entered amounts come off it. */}
      <div className={cn('mx-4 mt-4 card-paper p-4', summary.overBudget && 'border-2 border-terracotta')}>
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="text-xs font-black uppercase text-ink-muted">{budgetZAR != null ? 'Spent of your budget' : 'Spent so far'}</p>
            <p className="font-display font-bold text-2xl text-ink mt-0.5 tabular">
              {randExact(summary.spent)}
              {budgetZAR != null && <span className="text-sm font-normal text-ink-muted"> of {rand(budgetZAR)}</span>}
            </p>
          </div>
          <button type="button" onClick={onEditBudget} className={`text-xs font-bold text-sage-600 ${pressable}`}>
            {budgetZAR != null ? 'Edit budget' : 'Set budget'}
          </button>
        </div>
        {budgetZAR != null && (
          <div className="w-full h-2.5 bg-cream-dark rounded-full overflow-hidden">
            <div className={cn('h-full rounded-full transition-all duration-500', summary.overBudget ? 'bg-terracotta' : 'bg-sage-500')} style={{ width: `${budgetPercent}%` }} />
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div>
            <p className="text-[10px] uppercase font-bold text-ink-muted">{summary.overBudget ? 'Over budget' : 'Budget left'}</p>
            <p className={cn('font-black text-lg tabular', summary.overBudget ? 'text-terracotta' : 'text-sage-600')}>
              {summary.remaining == null ? 'Set a budget' : randExact(Math.abs(summary.remaining))}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-ink-muted">Projected total cost</p>
            <p className="font-black text-lg tabular text-ink">{randExact(summary.projected)}</p>
          </div>
        </div>
        <p className="text-[11px] text-ink-muted mt-2 leading-relaxed">
          Prices marked Suggested are only a guide. Type what you really paid and it comes off your budget.
          {summary.stillToPay > 0 && ` ${randExact(summary.stillToPay)} of suggested items is still unpaid.`}
          {summary.projectedOverBudget && ' At these prices you are likely to go over budget.'}
        </p>
        {unforeseenIsUsed && (
          <p className="text-[11px] font-bold text-terracotta mt-1">Unforeseen so far: {randExact(summary.unforeseen)}</p>
        )}
      </div>

      {pledgeCount > 0 && (
        <div className="mx-4 mt-4 card-paper p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-black uppercase text-ink-muted">Pledged by family</p>
              <p className="font-display font-bold text-2xl text-ink mt-0.5 tabular">{rand(totalPledged)}</p>
            </div>
            <button type="button" onClick={onViewPledges} className={`text-xs font-bold text-sage-600 ${pressable}`}>View pledges</button>
          </div>
          {pledgeShortfall != null && (
            <p className="text-xs text-ink-muted font-medium mt-2">
              {pledgeShortfall > 0 ? `${rand(pledgeShortfall)} of the budget still needs to be pledged` : 'Pledges cover the full budget'}
            </p>
          )}
        </div>
      )}

      {/* Add anything, including costs nobody planned for. */}
      {ceremonyId && (
        <div className="mx-4 mt-4 bg-white border-2 border-sage-200 rounded-soft p-4">
          <p className="text-xs font-black uppercase text-ink-muted mb-2">Add an item or an unforeseen expense</p>
          <form onSubmit={addItem} className="space-y-2">
            <div className="flex gap-2">
              <select value={form.phase} onChange={(e) => setForm({ ...form, phase: e.target.value })} className="w-2/5 border border-terracotta/20 rounded-soft px-2 py-2 text-xs">
                {PHASE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <input placeholder="e.g. Hired extra tent" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className="flex-1 border border-terracotta/20 rounded-soft px-3 py-2 text-sm" required />
            </div>
            <input
              type="number" inputMode="decimal" step="0.01" min="0"
              placeholder="What did this actually cost you? (R, optional)"
              value={form.actual} onChange={(e) => setForm({ ...form, actual: e.target.value })}
              className="w-full border border-terracotta/20 rounded-soft px-3 py-2 text-sm"
            />
            {form.phase !== UNFORESEEN_PHASE && (
              <label className="flex items-center gap-2 text-xs text-ink-muted">
                <input type="checkbox" checked={form.isOptional} onChange={(e) => setForm({ ...form, isOptional: e.target.checked })} />
                Household-specific / optional item
              </label>
            )}
            <button type="submit" disabled={adding} className={`w-full bg-sage-500 text-white font-bold py-2 rounded-pill text-sm ${pressable}`}>
              {adding ? 'Adding...' : form.phase === UNFORESEEN_PHASE ? '+ Add unforeseen expense' : '+ Add item'}
            </button>
          </form>
        </div>
      )}

      {costItems.length > 0 && (
        <div className="mx-4 mt-4 card-paper p-4">
          <h3 className="text-xs font-extrabold text-ink-muted uppercase tracking-wider mb-3">Provisioning &amp; Costs</h3>
          <div className="divide-y divide-cream-dark/50">
            {costItems.map((item) => {
              const paid = isPaidProvision(item)
              const suggested = suggestedTotal(item)
              return (
                <div key={item.id} className="flex items-center gap-3 py-3">
                  <button type="button" onClick={() => toggleBought(item)} className="flex-1 min-w-0 flex items-center gap-3 text-left group">
                    <div className={cn('w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all', paid ? 'bg-sage-500 border-sage-500' : 'border-cream-dark group-hover:border-sage-300')}>
                      {paid && <Icon name="check" size={13} color="#fff" strokeWidth={2.5} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <ScrollableLabel className={cn('text-sm font-medium', paid ? 'text-ink-muted line-through' : 'text-ink')}>{item.label}</ScrollableLabel>
                      {suggested > 0 && (
                        <p className="text-[10px] text-ink-muted">Suggested {rand(suggested)} ({item.quantity} x {rand(suggestedUnitCost(item))})</p>
                      )}
                    </div>
                  </button>
                  <div className="flex-shrink-0 flex items-center gap-1.5">
                    {item.skuId && !paid && (
                      <button type="button" onClick={() => buyItem(item)} className={`text-[11px] font-bold text-white bg-terracotta px-2.5 py-1.5 rounded-pill ${pressable}`}>Buy</button>
                    )}
                    <input
                      key={`${item.id}-${item.actualCostZAR ?? 'none'}`}
                      type="number" inputMode="decimal" min="0" step="0.01" placeholder="Paid R"
                      defaultValue={item.actualCostZAR ?? ''}
                      onBlur={(e) => saveProvisionPrice(item, e.target.value)}
                      className="w-20 border border-cream-dark rounded-soft px-2 py-1 text-xs text-right"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {unforeseenIsUsed && (
        <div className="mx-4 mt-4 card-paper p-4">
          <h3 className="text-xs font-extrabold text-terracotta uppercase tracking-wider mb-3">Unforeseen expenses</h3>
          <div className="divide-y divide-cream-dark/50">
            {unforeseenItems.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-3">
                <p className="flex-1 min-w-0 text-sm font-medium text-ink truncate">{item.label}</p>
                <input
                  key={`${item.id}-${item.actualCostZAR ?? 'none'}`}
                  type="number" inputMode="decimal" min="0" step="0.01" placeholder="Paid R"
                  defaultValue={item.actualCostZAR != null ? parseFloat(item.actualCostZAR) : ''}
                  onBlur={(e) => saveTaskPrice(item, e.target.value)}
                  className="w-20 border border-cream-dark rounded-soft px-2 py-1 text-xs text-right"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mx-4 mt-4 bg-white border-2 border-terracotta/25 rounded-soft p-5 shadow-soft">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xs font-extrabold text-ink-muted uppercase tracking-wider">Checklist</h3>
          {tasksLogged > 0 && <span className="text-xs font-bold text-sage-600">{rand(tasksLogged)} logged</span>}
        </div>
        <div className="divide-y divide-cream-dark/50">
          {taskItems.map((item) => {
            const done = item.isCompleted || item.isChecked
            return (
              <div key={item.id} className="flex items-center gap-3 py-3">
                <button onClick={() => toggleTask(item)} className="flex-1 flex items-center gap-3 text-left group transition-colors hover:bg-sage-50/50 -mx-2 px-2 py-1 rounded-xl min-w-0">
                  <div className={cn('w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all duration-300', done ? 'bg-sage-500 border-sage-500 scale-110' : 'border-cream-dark group-hover:border-sage-300')}>
                    {done && <Icon name="check" size={13} color="#fff" strokeWidth={2.5} />}
                  </div>
                  <ScrollableLabel className={cn('flex-1 min-w-0 text-sm font-medium transition-all duration-200', done ? 'text-ink-muted line-through' : 'text-ink')}>{item.label}</ScrollableLabel>
                </button>
                <div className="flex-shrink-0 text-right">
                  {item.targetCostZAR != null && <p className="text-[9px] text-ink-muted uppercase">Est. R{parseFloat(item.targetCostZAR).toFixed(0)}</p>}
                  <input
                    key={`${item.id}-${item.actualCostZAR ?? 'none'}`}
                    type="number" inputMode="decimal" min="0" step="0.01" placeholder="Actual R"
                    defaultValue={item.actualCostZAR != null ? parseFloat(item.actualCostZAR) : ''}
                    onBlur={(e) => saveTaskPrice(item, e.target.value)}
                    className="w-20 border border-cream-dark rounded-soft px-2 py-1 text-xs text-right"
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
