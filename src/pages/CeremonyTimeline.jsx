import { useState, useEffect } from 'react'

function CeremonyTimeline({ ceremonyType, onBack }) {
      const [timeline, setTimeline] = useState({ phases: [] })

        useEffect(() => {
                fetch(`/api/ceremonies/timeline/${ceremonyType}`)
                      .then(res => res.json())
                            .then(data => setTimeline(data && Array.isArray(data.phases) ? data : { phases: [] }))
        }, [ceremonyType])

          return (
                  <div className="min-h-screen pb-24 bg-cream px-4 pt-6">
                        <button onClick={onBack} className="text-sm text-ink-muted mb-4">← Back</button>
                              <h2 className="font-display font-bold text-2xl text-ink mb-1">{ceremonyType.replace(/_/g, ' ')} — The Full Day</h2>
                                    <p className="text-xs text-ink-muted mb-6">In order, so nothing catches you off guard.</p>

                                          <div className="space-y-5">
                                                {timeline.phases.map((phase) => (
                                                      <div key={phase.key} className="bg-white border-2 border-terracotta/25 rounded-soft p-4">
                                                            <p className="text-xs font-black uppercase tracking-wider text-sage-600 mb-3">{phase.label}</p>
                                                            <div className="space-y-3">
                                                                  {phase.checklist.map((step, idx) => (
                                                                        <div key={`${phase.key}-${idx}`} className="flex items-start gap-3">
                                                                              <div className="w-6 h-6 rounded-full bg-sage-500 text-white flex items-center justify-center flex-shrink-0 text-[10px] font-black">
                                                                                    {idx + 1}
                                                                              </div>
                                                                              <p className="text-sm font-bold text-ink pt-0.5">{step}</p>
                                                                        </div>
                                                                  ))}
                                                            </div>
                                                      </div>
                                                ))}
                                          </div>
                  </div>
          )
}

export default CeremonyTimeline