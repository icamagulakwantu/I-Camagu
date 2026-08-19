import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'

const STATUS_COLORS = { PENDING: 'bg-cream-dark text-ink-muted', QUOTED: 'bg-sage-100 text-sage-700', CONFIRMED: 'bg-sage-500 text-white', DECLINED: 'bg-terracotta/20 text-terracotta' }
const STATUSES = ['PENDING', 'QUOTED', 'CONFIRMED', 'DECLINED']

function EkoyiniAdmin({ onBack }) {
      const { accessToken } = useAuth()
        const { showToast } = useToast()
          const [quotes, setQuotes] = useState([])
            const [loading, setLoading] = useState(true)

              const fetchQuotes = () => {
                      fetch('/api/ekoyini/quote/all', { headers: { Authorization: `Bearer ${accessToken}` } })
                            .then(res => res.json())
                                  .then((data) => { setQuotes(Array.isArray(data) ? data : []); setLoading(false) })
              }

                useEffect(() => { fetchQuotes() }, [])

                  const updateStatus = async (quoteId, status) => {
                          await fetch('/api/ekoyini/quote/status', {
                                    method: 'PATCH',
                                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                                                body: JSON.stringify({ quoteId, status }),
                          })
                              showToast('Status updated', 'success')
                                  fetchQuotes()
                  }

                    if (loading) return <div className="p-4 text-ink-muted">Loading...</div>

                      return (
                              <div className="min-h-screen pb-24 bg-cream px-4 pt-6">
                                    <button onClick={onBack} className="text-sm text-ink-muted mb-4">← Back</button>
                                          <h2 className="font-display font-bold text-2xl text-ink mb-4">Ekoyini Admin — Quote Requests</h2>

                                                {quotes.length === 0 ? (
                                                            <EmptyState emoji="📋" title="No quote requests yet" description="They'll appear here as clients submit them." />
                                                ) : (
                                                            <div className="space-y-3">
                                                                      {quotes.map((q) => (
                                                                                      <div key={q.id} className="bg-white border-2 border-ink rounded-soft p-4">
                                                                                                    <div className="flex justify-between items-start mb-2">
                                                                                                                    <div>
                                                                                                                                      <p className="font-bold text-sm">{q.fullName} {q.surname}</p>
                                                                                                                                                        <p className="text-xs text-ink-muted">{q.clientEmail} · {q.cellPhone}</p>
                                                                                                                                                                        </div>
                                                                                                                                                                                        <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-pill ${STATUS_COLORS[q.status]}`}>{q.status}</span>
                                                                                                                                                                                                      </div>
                                                                                                                                                                                                                    <p className="text-xs text-ink-muted mb-1">📅 {new Date(q.eventDate).toLocaleDateString()} · 📍 {q.venueArea}</p>
                                                                                                                                                                                                                                  <p className="text-xs text-ink-muted mb-3">📦 {q.packageSelected} · 👥 {q.guestCount} guests</p>
                                                                                                                                                                                                                                                <div className="flex gap-2 flex-wrap">
                                                                                                                                                                                                                                                                {STATUSES.map((s) => (
                                                                                                                                                                                                                                                                                      <button key={s} onClick={() => updateStatus(q.id, s)}
                                                                                                                                                                                                                                                                                                          className={`text-xs font-bold px-3 py-1.5 rounded-pill ${q.status === s ? 'bg-ink text-white' : 'border border-ink/20 text-ink-muted'}`}>
                                                                                                                                                                                                                                                                                                                              {s}
                                                                                                                                                                                                                                                                                                                                                </button>
                                                                                                                                                                                                                                                                ))}
                                                                                                                                                                                                                                                                              </div>
                                                                                                                                                                                                                                                                                          </div>
                                                                      ))}
                                                                              </div>
                                                )}
                                                    </div>
                      )
}

export default EkoyiniAdmin