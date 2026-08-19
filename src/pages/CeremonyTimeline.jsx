import { useState, useEffect } from 'react'

function CeremonyTimeline({ ceremonyType, onBack }) {
      const [timeline, setTimeline] = useState([])

        useEffect(() => {
                fetch(`/api/ceremonies/timeline/${ceremonyType}`)
                      .then(res => res.json())
                            .then(setTimeline)
        }, [ceremonyType])

          return (
                  <div className="min-h-screen pb-24 bg-cream px-4 pt-6">
                        <button onClick={onBack} className="text-sm text-ink-muted mb-4">← Back</button>
                              <h2 className="font-display font-bold text-2xl text-ink mb-1">{ceremonyType.replace(/_/g, ' ')} — The Full Day</h2>
                                    <p className="text-xs text-ink-muted mb-6">In order, so nothing catches you off guard.</p>

                                          <div className="relative pl-6">
                                                  <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-sage-200" />
                                                          {timeline.map((step, idx) => (
                                                                        <div key={idx} className="relative mb-5">
                                                                                    <div className="absolute -left-6 top-0 w-5 h-5 rounded-full bg-sage-500 border-4 border-cream flex items-center justify-center">
                                                                                                  <span className="text-[9px] text-white font-black">{step.order}</span>
                                                                                                              </div>
                                                                                                                          <p className="text-sm font-bold text-ink pl-2">{step.label}</p>
                                                                                                                                    </div>
                                                          ))}
                                                                </div>
                                                                    </div>
          )
}

export default CeremonyTimeline
