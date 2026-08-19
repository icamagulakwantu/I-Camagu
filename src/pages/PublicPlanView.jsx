import { useState, useEffect } from 'react'

function PublicPlanView({ token }) {
      const [plan, setPlan] = useState(null)
        const [error, setError] = useState('')
          const [loading, setLoading] = useState(true)

            useEffect(() => {
                    fetch(`/api/public/plan/${token}`)
                          .then(res => res.json())
                                .then((data) => {
                                            if (data.error) setError(data.error)
                                                    else setPlan(data)
                                                            setLoading(false)
                                })
                                      .catch(() => { setError('Could not load this checklist'); setLoading(false) })
            }, [token])

              if (loading) return <div className="min-h-screen bg-cream flex items-center justify-center"><p className="text-ink-muted">Loading...</p></div>

                if (error) {
                        return (
                                  <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 text-center">
                                          <p className="text-4xl mb-3">🔗</p>
                                                  <p className="font-bold text-ink mb-1">{error}</p>
                                                          <a href="/" className="mt-4 text-sage-600 underline text-sm">Go to iCamagu</a>
                                                                </div>
                        )
                }

                  const phases = [...new Set(plan.checklistItems.map(i => i.phase))]
                    const doneCount = plan.checklistItems.filter(i => i.isChecked).length

                      return (
                              <div className="min-h-screen bg-cream">
                                    <div className="bg-gradient-to-br from-sage-500 to-sage-600 text-white px-5 pt-10 pb-6 rounded-b-[2.5rem]">
                                            <p className="text-xs uppercase tracking-widest text-white/70">Shared from iCamagu 🌾</p>
                                                    <h1 className="font-display font-bold text-2xl mt-1">{plan.title}</h1>
                                                            <p className="text-white/70 text-sm mt-1">Hosted by {plan.host.firstName} {plan.host.lastName} — {doneCount}/{plan.checklistItems.length} done</p>
                                                                  </div>

                                                                        <div className="px-4 mt-4 pb-10">
                                                                                <div className="bg-sage-50 border border-sage-200 rounded-soft p-3 mb-4 text-center">
                                                                                          <p className="text-xs text-ink-muted">This is a <strong>view-only</strong> copy. Download iCamagu to edit your own checklist.</p>
                                                                                                    <a href="/" className="inline-block mt-2 bg-sage-500 text-white text-xs font-bold px-4 py-2 rounded-pill">Get iCamagu</a>
                                                                                                            </div>

                                                                                                                    {phases.map((phase) => (
                                                                                                                                  <div key={phase} className="mb-4">
                                                                                                                                              <p className="text-xs font-black uppercase text-ink-muted mb-2">{phase.replace(/_/g, ' ')}</p>
                                                                                                                                                          <div className="space-y-1.5">
                                                                                                                                                                        {plan.checklistItems.filter(i => i.phase === phase).map((item) => (
                                                                                                                                                                                            <div key={item.id} className="flex items-center gap-3 bg-white border border-ink/15 rounded-soft p-3">
                                                                                                                                                                                                              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 ${item.isChecked ? 'bg-sage-500 border-sage-500' : 'border-cream-dark'}`}>
                                                                                                                                                                                                                                  {item.isChecked && <span className="text-white text-xs">✓</span>}
                                                                                                                                                                                                                                                    </div>
                                                                                                                                                                                                                                                                      <span className={`text-sm ${item.isChecked ? 'line-through text-ink-muted' : 'text-ink'}`}>{item.label}</span>
                                                                                                                                                                                                                                                                                      </div>
                                                                                                                                                                        ))}
                                                                                                                                                                                    </div>
                                                                                                                                                                                              </div>
                                                                                                                    ))}
                                                                                                                          </div>
                                                                                                                              </div>
                      )
}

export default PublicPlanView
                        