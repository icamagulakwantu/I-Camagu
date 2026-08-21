import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'

const TYPE_ICON = { CONTRIBUTION: '💰', PAYOUT: '💸', CEREMONY: '📋', ORDER: '📦' }
const STATUS_COLOR = { PENDING: 'text-ink-muted', CONFIRMED: 'text-sage-600', PENDING_APPROVAL: 'text-terracotta', CLEARED: 'text-sage-600' }

function Activity({ onBack }) {
      const { accessToken } = useAuth()
        const [feed, setFeed] = useState([])
          const [loading, setLoading] = useState(true)

            useEffect(() => {
                    fetch('/api/activity/my', { headers: { Authorization: `Bearer ${accessToken}` } })
                          .then(async (res) => {
                                const data = await res.json()
                                if (!res.ok) throw new Error()
                                setFeed(Array.isArray(data) ? data : [])
                          })
                          .catch(() => setFeed([]))
                          .finally(() => setLoading(false))
            }, [])

              return (
                      <div className="min-h-screen pb-24 bg-cream px-4 pt-6">
                            <button onClick={onBack} className="text-sm text-ink-muted mb-4">← Back</button>
                                  <h2 className="font-display font-bold text-2xl text-ink mb-1">My Activity</h2>
                                        <p className="text-xs text-ink-muted mb-4">Everything you've done, in one place.</p>

                                              {loading ? (
                                                          <div className="space-y-2"><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div>
                                              ) : feed.length === 0 ? (
                                                          <EmptyState emoji="📜" title="No activity yet" description="Your contributions, payouts, and plans will show up here." />
                                              ) : (
                                                          <div className="space-y-2">
                                                                    {feed.map((item, idx) => (
                                                                                    <div key={idx} className="bg-white border border-ink/15 rounded-soft p-3 flex items-center gap-3">
                                                                                                  <span className="text-xl">{TYPE_ICON[item.type]}</span>
                                                                                                                <div className="flex-1">
                                                                                                                                <p className="text-sm text-ink">{item.text}</p>
                                                                                                                                                <p className="text-xs text-ink-muted">{new Date(item.date).toLocaleDateString()}</p>
                                                                                                                                                              </div>
                                                                                                                                                                            {item.status && <span className={`text-[10px] font-black uppercase ${STATUS_COLOR[item.status] || 'text-ink-muted'}`}>{item.status.replace(/_/g, ' ')}</span>}
                                                                                                                                                                                        </div>
                                                                    ))}
                                                                            </div>
                                              )}
                                                  </div>
              )
}

export default Activity
