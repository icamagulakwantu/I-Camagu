import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'

const money = (value) => Number(value || 0).toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

function BudgetDashboard({ planId, planTitle, onBack }) {
  const { accessToken } = useAuth()
  const [budget, setBudget] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!planId) { setError('No ceremony plan was selected'); return }
    setError('')
    setBudget(null)
    fetch('/api/ceremonies/plans/' + planId + '/budget', { headers: { Authorization: 'Bearer ' + accessToken } })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Could not load budget')
        setBudget(data)
      })
      .catch((err) => setError(err.message))
  }, [planId, accessToken])

  if (error) return (
    <div className="min-h-screen bg-cream px-4 pt-10">
      <button onClick={onBack} className="text-sm text-ink-muted mb-4 block">← Back</button>
      <EmptyState emoji="⚠️" title="Could not load budget" description={error} />
    </div>
  )
  if (!budget) return <div className="p-4"><Skeleton className="h-40 w-full" /></div>

  const estimated = Number(budget.totalEstimated || 0)
  const spent = Number(budget.totalActual || 0)
  const pledged = Number(budget.totalPledged || 0)
  const allocated = budget.budgetZAR == null ? null : Number(budget.budgetZAR)
  const remaining = budget.remaining == null ? null : Number(budget.remaining)
  const pledgedPercent = estimated > 0 ? Math.min(100, Math.round((pledged / estimated) * 100)) : 0
  const overBudget = remaining != null && remaining < 0

  return (
    <div className="min-h-screen pb-24 bg-cream">
      <div className="bg-gradient-to-br from-sage-500 to-sage-600 text-white px-5 pt-10 pb-6 rounded-b-[2.5rem]">
        <button onClick={onBack} className="text-sm text-white/70 mb-3 block">← Back</button>
        <h1 className="font-display font-bold text-2xl">Budget — {planTitle}</h1>
      </div>
      <div className="px-4 mt-4">
        {allocated == null ? (
          <div className="bg-white border-2 border-terracotta/25 rounded-soft p-4 mb-4"><p className="font-bold text-ink">No budget set yet</p><p className="text-sm text-ink-muted mt-1">Set a budget from the ceremony Budget &amp; Costs tab.</p></div>
        ) : (
          <div className={'bg-white border-2 rounded-soft p-4 mb-4 ' + (overBudget ? 'border-terracotta' : 'border-sage-200')}>
            <div className="flex justify-between items-center"><span className="text-xs text-ink-muted uppercase font-bold">Allocated budget</span><span className={(overBudget ? 'text-terracotta' : 'text-sage-600') + ' font-bold'}>R{money(allocated)}</span></div>
            <div className="grid grid-cols-2 gap-2 mt-3"><div><p className="text-xs text-ink-muted">Spent</p><p className="font-black text-lg">R{money(spent)}</p></div><div><p className="text-xs text-ink-muted">{overBudget ? 'Over budget' : 'Remaining'}</p><p className={(overBudget ? 'text-terracotta' : 'text-sage-600') + ' font-black text-lg'}>R{money(Math.abs(remaining))}</p></div></div>
          </div>
        )}
        <div className="bg-white border-2 border-terracotta/25 rounded-soft p-4 mb-4"><div className="flex justify-between mb-1"><span className="text-xs text-ink-muted">Pledged toward estimate</span><span className="text-xs font-bold">{pledgedPercent}%</span></div><div className="h-3 bg-cream-dark rounded-pill overflow-hidden"><div className="h-full bg-sage-500 transition-all" style={{ width: pledgedPercent + '%' }} /></div></div>
        <div className="grid grid-cols-3 gap-2 mb-4"><div className="bg-white border-2 border-terracotta/15 rounded-soft p-3 text-center"><p className="text-lg font-black text-ink">R{money(estimated)}</p><p className="text-[10px] text-ink-muted uppercase font-bold">Estimated</p></div><div className="bg-terracotta/10 border-2 border-terracotta/30 rounded-soft p-3 text-center"><p className="text-lg font-black text-terracotta">R{money(spent)}</p><p className="text-[10px] text-ink-muted uppercase font-bold">Spent</p></div><div className="bg-sage-50 border-2 border-sage-200 rounded-soft p-3 text-center"><p className="text-lg font-black text-sage-600">R{money(pledged)}</p><p className="text-[10px] text-ink-muted uppercase font-bold">Pledged</p></div></div>
        {budget.pledgeShortfall > 0 && <div className="bg-terracotta/10 border-2 border-terracotta rounded-soft p-3 mb-4"><p className="text-sm font-bold text-terracotta">R{money(budget.pledgeShortfall)} still needed to reach the allocated budget</p></div>}
        <p className="text-xs font-black uppercase text-ink-muted mb-2">Provisioning &amp; cost items</p>
        <div className="space-y-2">{budget.itemBreakdown.filter((item) => item.total > 0).map((item) => <div key={item.id} className="bg-white border border-terracotta/15 rounded-soft p-3 flex justify-between gap-3"><span className="text-sm text-ink">{item.label}</span><span className="text-xs text-ink-muted text-right">R{money(item.total)}{item.isPurchased ? ' · bought' : ' · estimated'}</span></div>)}</div>
      </div>
    </div>
  )
}

export default BudgetDashboard
