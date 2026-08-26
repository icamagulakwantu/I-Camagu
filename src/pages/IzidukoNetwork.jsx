import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'
import { Skeleton } from '../components/ui/Skeleton.jsx'
import Icon from '../components/Icon.jsx'

const TIER_COLOR = { 1: 'bg-terracotta text-white', 2: 'bg-terracotta/20 text-terracotta', 3: 'bg-sage-500 text-white', 4: 'bg-sage-100 text-sage-700', 5: 'bg-cream-dark text-ink-muted' }
const pressable = 'transition-transform duration-100 ease-out active:scale-[0.96] disabled:opacity-50'

function Avatar({ src, size = 'w-12 h-12' }) {
  return (
    <div className={`${size} rounded-full bg-sage-50 flex items-center justify-center text-xl overflow-hidden flex-shrink-0`}>
      {src ? <img src={src} alt="" className="w-full h-full object-cover" /> : <Icon name="user" size={18} color="#4a7a4a" />}
    </div>
  )
}

function IzidukoNetwork({ onBack }) {
  const { accessToken } = useAuth()
  const { showToast } = useToast()

  const [tab, setTab] = useState('matches')
  const [matches, setMatches] = useState([])
  const [profileComplete, setProfileComplete] = useState(true)
  const [message, setMessage] = useState('')
  const [requests, setRequests] = useState({ incoming: [], outgoing: [] })
  const [connections, setConnections] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [composerFor, setComposerFor] = useState(null)
  const [composerText, setComposerText] = useState('')

  const authedFetch = useCallback((url, options = {}) => fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}`, ...options.headers },
  }), [accessToken])

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [matchesRes, requestsRes, connectionsRes] = await Promise.all([
        authedFetch('/api/iziduko/matches').then((r) => r.json()),
        authedFetch('/api/iziduko/requests').then((r) => r.json()),
        authedFetch('/api/iziduko/connections').then((r) => r.json()),
      ])
      setMatches(matchesRes.matches || [])
      setProfileComplete(matchesRes.profileComplete !== false)
      setMessage(matchesRes.message || '')
      setRequests({ incoming: requestsRes.incoming || [], outgoing: requestsRes.outgoing || [] })
      setConnections(connectionsRes.connections || [])
    } catch {
      showToast('Could not load your Iziduko Network', 'error')
    } finally {
      setLoading(false)
    }
  }, [authedFetch, showToast])

  useEffect(() => { loadAll() }, [loadAll])

  const sendConnect = async (recipientId) => {
    setBusyId(recipientId)
    try {
      const res = await authedFetch('/api/iziduko/connect', {
        method: 'POST',
        body: JSON.stringify({ recipientId, message: composerText }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not send request')
      showToast(data.connection.status === 'ACCEPTED' ? "It's a match — you're both connected!" : 'Request sent', 'success')
      setComposerFor(null)
      setComposerText('')
      loadAll()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setBusyId(null)
    }
  }

  const respond = async (connectionId, accept) => {
    setBusyId(connectionId)
    try {
      const res = await authedFetch(`/api/iziduko/requests/${connectionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ accept }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not respond to request')
      showToast(accept ? 'Connected!' : 'Request declined', accept ? 'success' : 'info')
      loadAll()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setBusyId(null)
    }
  }

  const withdraw = async (connectionId) => {
    setBusyId(connectionId)
    try {
      const res = await authedFetch(`/api/iziduko/requests/${connectionId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not withdraw request')
      showToast('Request withdrawn', 'info')
      loadAll()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setBusyId(null)
    }
  }

  const TABS = [
    { id: 'matches', label: 'Matches', count: matches.length },
    { id: 'requests', label: 'Requests', count: requests.incoming.length },
    { id: 'connected', label: 'Connected', count: connections.length },
  ]

  return (
    <div className="min-h-screen pb-24 bg-cream">
      <div className="bg-gradient-to-br from-sage-500 to-sage-600 text-white px-5 pt-10 pb-6 rounded-b-[2.5rem]">
        <button onClick={onBack} className="text-sm text-white/70 mb-3 block">← Back</button>
        <h1 className="font-display font-bold text-2xl">Iziduko Network</h1>
        <p className="text-white/70 text-sm mt-1">Find your people — bloodline, not just a database.</p>
      </div>

      <div className="px-4 mt-4">
        <div className="flex bg-white border-2 border-terracotta/25 rounded-pill p-1 mb-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2 rounded-pill text-xs font-bold uppercase tracking-wide relative ${tab === t.id ? 'bg-sage-500 text-white' : 'text-ink-muted'}`}
            >
              {t.label}
              {t.count > 0 && (
                <span className={`ml-1 ${tab === t.id ? 'text-white/80' : 'text-terracotta'}`}>({t.count})</span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-2"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>
        ) : !profileComplete ? (
          <EmptyState emoji="🧬" title="Complete your ancestral profile first" description={message || 'Add your four Isiduko lines and a profile photo before viewing clan member profiles.'} />
        ) : (
          <>
            {tab === 'matches' && (
              matches.length === 0 ? (
                <EmptyState emoji="🤝" title="No matches yet" description="As more people join with your clan names, they'll show up here." />
              ) : (
                <div className="space-y-2">
                  {matches.map((m) => (
                    <div key={m.id} className="bg-white border-2 border-terracotta/25 rounded-soft p-4">
                      <div className="flex items-center gap-3">
                        <Avatar src={m.profileImage} />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-ink">{m.firstName} {m.lastName}</p>
                          <p className="text-xs text-ink-muted">{m.paternalIziduko} · {m.maternalIziduko}</p>
                          <p className="text-[10px] text-ink-muted mt-1">{m.matchedLines?.join(' · ')}</p>
                          <span className={`inline-block mt-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-pill ${TIER_COLOR[m.tier]}`}>{m.label}</span>
                        </div>
                      </div>

                      <div className="mt-3">
                        {m.connectionStatus === 'connected' && (
                          <span className="text-xs font-bold text-sage-600 flex items-center gap-1"><Icon name="check" size={12} color="#4a7a4a" /> Connected</span>
                        )}
                        {m.connectionStatus === 'pending_sent' && (
                          <span className="text-xs font-bold text-ink-muted">Request sent — awaiting reply</span>
                        )}
                        {m.connectionStatus === 'pending_received' && (
                          <button onClick={() => setTab('requests')} className={`text-xs font-bold text-terracotta underline ${pressable}`}>
                            They want to connect — respond in Requests
                          </button>
                        )}
                        {m.connectionStatus === 'none' && composerFor !== m.id && (
                          <button
                            onClick={() => { setComposerFor(m.id); setComposerText('') }}
                            className={`text-xs font-bold text-white bg-terracotta px-4 py-2 rounded-pill flex items-center gap-1.5 ${pressable}`}
                          >
                            <Icon name="link" size={13} color="#fff" /> Connect
                          </button>
                        )}
                        {m.connectionStatus === 'none' && composerFor === m.id && (
                          <div className="space-y-2 mt-2">
                            <input
                              type="text" placeholder="Say hello (optional)" value={composerText}
                              onChange={(e) => setComposerText(e.target.value)}
                              className="w-full border border-ink/30 rounded-soft px-3 py-2 text-xs"
                              maxLength={200}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => sendConnect(m.id)}
                                disabled={busyId === m.id}
                                className={`flex-1 text-xs font-bold text-white bg-terracotta py-2 rounded-pill ${pressable}`}
                              >
                                {busyId === m.id ? 'Sending...' : 'Send request'}
                              </button>
                              <button
                                onClick={() => setComposerFor(null)}
                                className={`text-xs font-bold text-ink-muted px-3 ${pressable}`}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {tab === 'requests' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-xs font-black uppercase text-ink-muted tracking-wide mb-2">Waiting on you</h3>
                  {requests.incoming.length === 0 ? (
                    <p className="text-xs text-ink-muted">No incoming requests right now.</p>
                  ) : (
                    <div className="space-y-2">
                      {requests.incoming.map((r) => (
                        <div key={r.id} className="bg-white border-2 border-terracotta/25 rounded-soft p-4">
                          <div className="flex items-center gap-3">
                            <Avatar src={r.requester.profileImage} />
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm text-ink">{r.requester.firstName} {r.requester.lastName}</p>
                              <p className="text-xs text-ink-muted">{r.requester.paternalIziduko} · {r.requester.maternalIziduko}</p>
                              {r.message && <p className="text-xs text-ink italic mt-1">"{r.message}"</p>}
                            </div>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => respond(r.id, true)} disabled={busyId === r.id}
                              className={`flex-1 text-xs font-bold text-white bg-sage-500 py-2 rounded-pill ${pressable}`}
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => respond(r.id, false)} disabled={busyId === r.id}
                              className={`flex-1 text-xs font-bold text-ink-muted border-2 border-terracotta/20 py-2 rounded-pill ${pressable}`}
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-xs font-black uppercase text-ink-muted tracking-wide mb-2">Sent by you</h3>
                  {requests.outgoing.length === 0 ? (
                    <p className="text-xs text-ink-muted">No pending requests sent.</p>
                  ) : (
                    <div className="space-y-2">
                      {requests.outgoing.map((r) => (
                        <div key={r.id} className="bg-white border-2 border-terracotta/25 rounded-soft p-4 flex items-center gap-3">
                          <Avatar src={r.recipient.profileImage} size="w-10 h-10" />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-ink">{r.recipient.firstName} {r.recipient.lastName}</p>
                            <p className="text-[10px] text-ink-muted">Awaiting reply</p>
                          </div>
                          <button
                            onClick={() => withdraw(r.id)} disabled={busyId === r.id}
                            className={`text-[10px] font-bold text-terracotta underline ${pressable}`}
                          >
                            Withdraw
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === 'connected' && (
              connections.length === 0 ? (
                <EmptyState emoji="🌳" title="No connections yet" description="Once someone accepts your request (or you accept theirs), they'll show up here." />
              ) : (
                <div className="space-y-2">
                  {connections.map((c) => (
                    <div key={c.id} className="bg-white border-2 border-terracotta/25 rounded-soft p-4 flex items-center gap-3">
                      <Avatar src={c.profileImage} />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-ink">{c.firstName} {c.lastName}</p>
                        <p className="text-xs text-ink-muted">{c.paternalIziduko} · {c.maternalIziduko}</p>
                        {c.phoneNumber && <p className="text-xs text-sage-600 font-bold mt-1 flex items-center gap-1"><Icon name="phone" size={11} color="#4a7a4a" /> {c.phoneNumber}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default IzidukoNetwork
