import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'

const TIER_COLOR = { 1: 'bg-terracotta text-white', 2: 'bg-terracotta/20 text-terracotta', 3: 'bg-sage-500 text-white', 4: 'bg-sage-100 text-sage-700', 5: 'bg-cream-dark text-ink-muted' }

function IzidukoNetwork({ onBack }) {
      const { accessToken } = useAuth()
        const [matches, setMatches] = useState([])
          const [profileComplete, setProfileComplete] = useState(true)
          const [message, setMessage] = useState('')
          const [loading, setLoading] = useState(true)

            useEffect(() => {
                    fetch('/api/iziduko/matches', { headers: { Authorization: `Bearer ${accessToken}` } })
                          .then(res => res.json())
                                .then((data) => { setMatches(data.matches || []); setProfileComplete(data.profileComplete !== false); setMessage(data.message || ''); setLoading(false) })
            }, [])

              return (
                      <div className="min-h-screen pb-24 bg-cream">
                            <div className="bg-gradient-to-br from-sage-500 to-sage-600 text-white px-5 pt-10 pb-6 rounded-b-[2.5rem]">
                                    <button onClick={onBack} className="text-sm text-white/70 mb-3 block">← Back</button>
                                            <h1 className="font-display font-bold text-2xl">Iziduko Network</h1>
                                                    <p className="text-white/70 text-sm mt-1">Find your people — bloodline, not just a database.</p>
                                                          </div>

                                                                <div className="px-4 mt-4">
                                                                        {loading ? (
                                                                                      <div className="space-y-2"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>
                                                                        ) : !profileComplete ? (
                                                                                      <EmptyState emoji="🧬" title="Complete your ancestral profile first" description={message || 'Add your four Isiduko lines and a profile photo before viewing clan member profiles.'} />
                                                                        ) : matches.length === 0 ? (
                                                                                      <EmptyState emoji="🤝" title="No matches yet" description="As more people join with your clan names, they'll show up here." />
                                                                        ) : (
                                                                                      <div className="space-y-2">
                                                                                                  {matches.map((m) => (
                                                                                                                    <div key={m.id} className="bg-white border-2 border-ink rounded-soft p-4 flex items-center gap-3">
                                                                                                                                    <div className="w-12 h-12 rounded-full bg-sage-50 flex items-center justify-center text-xl overflow-hidden flex-shrink-0">
                                                                                                                                                      {m.profileImage ? <img src={m.profileImage} alt="" className="w-full h-full object-cover" /> : '👤'}
                                                                                                                                                                      </div>
                                                                                                                                                                                      <div className="flex-1 min-w-0">
                                                                                                                                                                                                        <p className="font-bold text-sm text-ink">{m.firstName} {m.lastName}</p>
                                                                                                                                                                                                                          <p className="text-xs text-ink-muted">{m.paternalIziduko} · {m.maternalIziduko}</p>
                                                                                                                                    <p className="text-[10px] text-ink-muted mt-1">{m.matchedLines?.join(' · ')}</p>
                                                                                                                                                                                                                                            <span className={`inline-block mt-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-pill ${TIER_COLOR[m.tier]}`}>{m.label}</span>
                                                                                                                                                                                                                                                            </div>
                                                                                                                                                                                                                                                                          </div>
                                                                                                  ))}
                                                                                                            </div>
                                                                        )}
                                                                              </div>
                                                                                  </div>
              )
}

export default IzidukoNetwork