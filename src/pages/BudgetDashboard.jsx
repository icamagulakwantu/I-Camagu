import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'

function BudgetDashboard({ planId, planTitle, onBack }) {
      const { accessToken } = useAuth()
        const [budget, setBudget] = useState(null)
        const [error, setError] = useState('')

          useEffect(() => {
                  fetch(`/api/ceremonies/plans/${planId}/budget`, { headers: { Authorization: `Bearer ${accessToken}` } })
                        .then(async (res) => {
                              const data = await res.json()
                              if (!res.ok) throw new Error(data.error || 'Could not load budget')
                              setBudget(data)
                        })
                        .catch((err) => setError(err.message))
          }, [planId, accessToken])

            if (error) {
                  return (
                        <div className="min-h-screen bg-cream px-4 pt-10">
                              <button onClick={onBack} className="text-sm text-ink-muted mb-4 block">← Back</button>
                              <EmptyState emoji="⚠️" title="Could not load budget" description={error} />
                        </div>
                  )
            }

            if (!budget) return <div className="p-4"><Skeleton className="h-40 w-full" /></div>

              const pledgedPercent = budget.totalEstimated > 0 ? Math.min(100, Math.round((budget.totalPledged / budget.totalEstimated) * 100)) : 0

                return (
                        <div className="min-h-screen pb-24 bg-cream">
                              <div className="bg-gradient-to-br from-sage-500 to-sage-600 text-white px-5 pt-10 pb-6 rounded-b-[2.5rem]">
                                      <button onClick={onBack} className="text-sm text-white/70 mb-3 block">← Back</button>
                                              <h1 className="font-display font-bold text-2xl">Budget — {planTitle}</h1>
                                                    </div>

                                                          <div className="px-4 mt-4">
                                                                  <div className="bg-white border-2 border-ink rounded-soft p-4 mb-4">
                                                                            <div className="flex justify-between mb-1">
                                                                                        <span className="text-xs text-ink-muted">Pledged toward estimate</span>
                                                                                                    <span className="text-xs font-bold">{pledgedPercent}%</span>
                                                                                                              </div>
                                                                                                                        <div className="h-3 bg-cream-dark rounded-pill overflow-hidden">
                                                                                                                                    <div className="h-full bg-sage-500 transition-all" style={{ width: `${pledgedPercent}%` }} />
                                                                                                                                              </div>
                                                                                                                                                      </div>

                                                                                                                                                              <div className="grid grid-cols-3 gap-2 mb-4">
                                                                                                                                                                        <div className="bg-white border-2 border-ink/15 rounded-soft p-3 text-center">
                                                                                                                                                                                    <p className="text-lg font-black text-ink">R{budget.totalEstimated.toFixed(0)}</p>
                                                                                                                                                                                                <p className="text-[10px] text-ink-muted uppercase font-bold">Estimated</p>
                                                                                                                                                                                                          </div>
                                                                                                                                                                                                                    <div className="bg-terracotta/10 border-2 border-terracotta/30 rounded-soft p-3 text-center">
                                                                                                                                                                                                                                <p className="text-lg font-black text-terracotta">R{budget.totalActual.toFixed(0)}</p>
                                                                                                                                                                                                                                            <p className="text-[10px] text-ink-muted uppercase font-bold">Actual</p>
                                                                                                                                                                                                                                                      </div>
                                                                                                                                                                                                                                                                <div className="bg-sage-50 border-2 border-sage-200 rounded-soft p-3 text-center">
                                                                                                                                                                                                                                                                            <p className="text-lg font-black text-sage-600">R{budget.totalPledged.toFixed(0)}</p>
                                                                                                                                                                                                                                                                                        <p className="text-[10px] text-ink-muted uppercase font-bold">Pledged</p>
                                                                                                                                                                                                                                                                                                  </div>
                                                                                                                                                                                                                                                                                                          </div>

                                                                                                                                                                                                                                                                                                                  {budget.shortfall > 0 && (
                                                                                                                                                                                                                                                                                                                                <div className="bg-terracotta/10 border-2 border-terracotta rounded-soft p-3 mb-4">
                                                                                                                                                                                                                                                                                                                                            <p className="text-sm font-bold text-terracotta">R{budget.shortfall.toFixed(0)} still needed to cover the estimate</p>
                                                                                                                                                                                                                                                                                                                                                      </div>
                                                                                                                                                                                                                                                                                                                  )}

                                                                                                                                                                                                                                                                                                                          <p className="text-xs font-black uppercase text-ink-muted mb-2">Item Breakdown</p>
                                                                                                                                                                                                                                                                                                                                  <div className="space-y-2">
                                                                                                                                                                                                                                                                                                                                            {budget.itemBreakdown.filter(i => i.targetCostZAR || i.actualCostZAR).map((item, idx) => (
                                                                                                                                                                                                                                                                                                                                                            <div key={idx} className="bg-white border border-ink/15 rounded-soft p-3 flex justify-between">
                                                                                                                                                                                                                                                                                                                                                                          <span className="text-sm text-ink">{item.label}</span>
                                                                                                                                                                                                                                                                                                                                                                                        <span className="text-xs text-ink-muted">
                                                                                                                                                                                                                                                                                                                                                                                                        {item.targetCostZAR ? `R${parseFloat(item.targetCostZAR).toFixed(0)} est.` : ''}
                                                                                                                                                                                                                                                                                                                                                                                                                        {item.actualCostZAR ? ` / R${parseFloat(item.actualCostZAR).toFixed(0)} actual` : ''}
                                                                                                                                                                                                                                                                                                                                                                                                                                      </span>
                                                                                                                                                                                                                                                                                                                                                                                                                                                  </div>
                                                                                                                                                                                                                                                                                                                                            ))}
                                                                                                                                                                                                                                                                                                                                                    </div>
                                                                                                                                                                                                                                                                                                                                                          </div>
                                                                                                                                                                                                                                                                                                                                                              </div>
                )
}

export default BudgetDashboard
