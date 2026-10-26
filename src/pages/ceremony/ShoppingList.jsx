import { useState, useEffect, useCallback } from 'react'
import { useToast } from '../../components/ui/Toast.jsx'
import { Skeleton } from '../../components/ui/Skeleton.jsx'
import { cn } from '../../lib/utils'
import { hasActual, UNFORESEEN_PHASE } from '../../../shared/ceremonyCosts.js'
import {
  buildListRows, groupRowsByPhase, phaseLabel, summariseRows, countProgress, isTaskDone,
} from '../../../shared/ceremonyList.js'
import { request } from './api.js'
import Bi from './Bi.jsx'
import MoneyCard from './MoneyCard.jsx'
import PoolOfferCard from '../../components/PoolOfferCard.jsx'
import ListRow from './ListRow.jsx'
import { BUTTONS } from './wizardText.js'
import { inputClass, pressable } from './styles.js'

const PHASE_OPTIONS = [
  { value: 'CUSTOM', label: 'Something I am adding' },
  { value: 'FOOD', label: 'Food' },
  { value: 'FAMILY', label: 'Family' },
  { value: 'LOGISTICS', label: 'Logistics' },
  { value: 'SEATING', label: 'Seating' },
  { value: 'SPEAKERS', label: 'Speakers' },
  { value: UNFORESEEN_PHASE, label: 'Unexpected expense' },
]

const EMPTY_ADD = { phase: 'CUSTOM', label: '', actual: '' }

const taskEndpoints = (task) => (task.ceremonyId
  ? { toggle: `/api/ceremonies/ceremony-checklist/${task.id}/toggle`, price: `/api/ceremonies/checklist/${task.id}` }
  : { toggle: `/api/ceremonies/plans/items/${task.id}/toggle`, price: `/api/ceremonies/plans/items/${task.id}/cost` })

const unforeseenRow = (task) => ({
  key: `unforeseen-${task.id}`,
  kind: 'task',
  label: task.label,
  cost: null,
  task,
  actual: hasActual(task) ? Number(task.actualCostZAR) : null,
  done: false,
})

// The whole money picture in ONE list. The server still keeps provisions and
// checklist tasks apart, so a row that is both is written to both (the price
// goes to each) and the old screens that read either one stay correct.
export default function ShoppingList({ ceremonyId, accessToken, budgetZAR, legacyItems = [], onEditBudget, onItemsChanged }) {
  const { showToast } = useToast()
  const [costItems, setCostItems] = useState([])
  const [checklistItems, setChecklistItems] = useState(legacyItems)
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(EMPTY_ADD)
  const [adding, setAdding] = useState(false)
  const [busyKey, setBusyKey] = useState(null)
  const [offerCost, setOfferCost] = useState(null)

  const load = useCallback(async () => {
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

  const commit = (nextCosts, nextTasks) => {
    setCostItems(nextCosts)
    setChecklistItems(nextTasks)
    onItemsChanged?.({ costItems: nextCosts, checklistItems: nextTasks })
  }

  const setTaskPrice = (task, value) => request(taskEndpoints(task).price, accessToken, {
    method: 'PATCH', body: JSON.stringify({ actualCostZAR: value }),
  })

  // The toggle endpoints flip the state, so only call them when it differs.
  const setTaskDone = async (task, done) => (isTaskDone(task) === done
    ? task
    : request(taskEndpoints(task).toggle, accessToken, { method: 'PATCH' }))

  const replaceTask = (tasks, updated) => tasks.map((t) => (t.id === updated.id ? updated : t))

  const toggleRow = async (row) => {
    const makeDone = !row.done
    setBusyKey(row.key)
    try {
      let nextCosts = costItems
      let nextTasks = checklistItems
      if (row.cost) {
        await request(`/api/ceremonies/cost/${row.cost.id}`, accessToken, { method: 'PATCH', body: JSON.stringify({ isPurchased: makeDone }) })
        const updated = { ...row.cost, isPurchased: makeDone }
        // Un-ticking also clears the price, so nothing stays deducted for something not bought.
        if (!makeDone && hasActual(row.cost)) {
          await request(`/api/ceremonies/cost/${row.cost.id}/actual`, accessToken, { method: 'PATCH', body: JSON.stringify({ actualCostZAR: null }) })
          updated.actualCostZAR = null
        }
        nextCosts = costItems.map((c) => (c.id === updated.id ? updated : c))
      }
      if (row.task) {
        let task = row.task
        if (!makeDone && hasActual(task)) task = await setTaskPrice(task, null)
        task = await setTaskDone(task, makeDone)
        nextTasks = replaceTask(checklistItems, task)
      }
      commit(nextCosts, nextTasks)
    } catch (err) {
      showToast(err.message, 'error')
      load()
    } finally {
      setBusyKey(null)
    }
  }

  const savePrice = async (row, value) => {
    const parsed = value === '' ? null : parseFloat(value)
    if (parsed !== null && (Number.isNaN(parsed) || parsed < 0)) {
      showToast('Please type an amount in rand', 'error')
      return
    }
    if (parsed === row.actual) return
    setBusyKey(row.key)
    try {
      let nextCosts = costItems
      let nextTasks = checklistItems
      if (row.cost) {
        const data = await request(`/api/ceremonies/cost/${row.cost.id}/actual`, accessToken, {
          method: 'PATCH', body: JSON.stringify({ actualCostZAR: value === '' ? null : value }),
        })
        nextCosts = costItems.map((c) => (c.id === row.cost.id
          ? { ...c, actualCostZAR: data.actualCostZAR, isPurchased: data.actualCostZAR !== null ? true : c.isPurchased }
          : c))
      }
      if (row.task) {
        let task = await setTaskPrice(row.task, parsed)
        if (parsed !== null) task = await setTaskDone(task, true)
        nextTasks = replaceTask(checklistItems, task)
      }
      commit(nextCosts, nextTasks)
      showToast(parsed === null ? 'Amount cleared' : 'Amount saved', 'success')
    } catch (err) {
      showToast(err.message, 'error')
      load()
    } finally {
      setBusyKey(null)
    }
  }

  const buyItem = (cost) => setOfferCost(cost)

  const addItem = async (e) => {
    e.preventDefault()
    if (!form.label.trim()) return
    setAdding(true)
    try {
      const unforeseen = form.phase === UNFORESEEN_PHASE
      const data = await request(`/api/ceremonies/${ceremonyId}/checklist`, accessToken, {
        method: 'POST',
        body: JSON.stringify({
          phase: form.phase,
          label: form.label,
          isOptional: !unforeseen,
          actualCostZAR: form.actual === '' ? null : parseFloat(form.actual),
        }),
      })
      commit(costItems, [...checklistItems, data])
      setForm(EMPTY_ADD)
      setShowAdd(false)
      showToast(unforeseen ? 'Added to your unexpected costs' : 'Added to your list', 'success')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setAdding(false)
    }
  }

  if (loading) {
    return <div className="mx-4 mt-4 space-y-2"><Skeleton className="h-40 w-full" /><Skeleton className="h-32 w-full" /></div>
  }

  const rows = buildListRows({ costItems, checklistItems })
  const unforeseenRows = checklistItems.filter((i) => i.phase === UNFORESEEN_PHASE).map(unforeseenRow)
  const summary = summariseRows({
    budgetZAR,
    rows,
    unforeseenItems: checklistItems.filter((i) => i.phase === UNFORESEEN_PHASE),
  })
  const { done, total } = countProgress(rows)
  const rowProps = { onToggle: toggleRow, onSavePrice: savePrice, onBuy: buyItem }

  return (
    <div className="px-4 mt-4 space-y-4">
      <MoneyCard summary={summary} budgetZAR={budgetZAR} onEditBudget={onEditBudget} />

      <p className="text-sm font-bold text-ink">{done} / {total} <span className="font-normal text-ink-muted">done</span></p>

      <button type="button" onClick={() => setShowAdd((v) => !v)} className={cn('w-full h-14 rounded-pill bg-white border-2 border-terracotta text-terracotta', pressable)}>
        <Bi {...(showAdd ? BUTTONS.cancel : { xh: 'Ongeza into', en: 'Add something to the list' })} />
      </button>

      {showAdd && (
        <form onSubmit={addItem} className="bg-white border-2 border-terracotta/25 rounded-soft p-4 space-y-3">
          <select value={form.phase} onChange={(e) => setForm({ ...form, phase: e.target.value })} className={inputClass}>
            {PHASE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <input className={inputClass} placeholder="e.g. Hired extra tent" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} required />
          <input
            type="number" inputMode="decimal" step="0.01" min="0"
            className={inputClass}
            placeholder="What did it cost? (R, optional)"
            value={form.actual}
            onChange={(e) => setForm({ ...form, actual: e.target.value })}
          />
          <button type="submit" disabled={adding} className={cn('w-full h-14 rounded-pill bg-terracotta text-white', pressable)}>
            <Bi {...BUTTONS.add} />
          </button>
        </form>
      )}

      {rows.length === 0 && unforeseenRows.length === 0 && (
        <div className="card-paper p-4 text-sm text-ink-muted">Nothing on your list yet. Use the button above to add the first item.</div>
      )}

      {groupRowsByPhase(rows).map((group) => (
        <div key={group.phase} className="card-paper p-4">
          <h3 className="text-xs font-extrabold text-ink-muted uppercase tracking-wider mb-1">{phaseLabel(group.phase)}</h3>
          <div className="divide-y divide-cream-dark/50">
            {group.rows.map((row) => <ListRow key={row.key} row={row} busy={busyKey === row.key} {...rowProps} />)}
          </div>
        </div>
      ))}

      {unforeseenRows.length > 0 && (
        <div className="card-paper p-4">
          <h3 className="text-xs font-extrabold text-terracotta uppercase tracking-wider mb-1">Unexpected expenses</h3>
          <div className="divide-y divide-cream-dark/50">
            {unforeseenRows.map((row) => <ListRow key={row.key} row={row} showTick={false} busy={busyKey === row.key} {...rowProps} />)}
          </div>
        </div>
      )}
      {offerCost && <PoolOfferCard cost={offerCost} ceremonyId={ceremonyId} onClose={() => setOfferCost(null)} />}
    </div>
  )
}
