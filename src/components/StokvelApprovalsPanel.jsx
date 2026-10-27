import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from './ui/Toast.jsx'
import Icon from './Icon.jsx'

const rand = (n) => `R${Number(n).toFixed(2)}`

// "Izicelo ezilindileyo / Requests waiting" — only officials see this.
// People asking to join, and group expenses that need a second official.
// Nobody can approve their own expense; they can only cancel it.
export default function StokvelApprovalsPanel({ stokvelId }) {
  const { accessToken } = useAuth()
  const { showToast } = useToast()
  const [data, setData] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [pins, setPins] = useState({})
  const [visiblePins, setVisiblePins] = useState({})

  const load = useCallback(async () => {
    const res = await fetch(`/api/stokvels/${stokvelId}/approvals`, { headers: { Authorization: `Bearer ${accessToken}` } })
    if (res.ok) setData(await res.json())
    else setData(null) // not an official: show nothing
  }, [stokvelId, accessToken])

  useEffect(() => { load() }, [load])

  const send = async (id, path, body = {}) => {
    setBusyId(id)
    try {
      const res = await fetch(`/api/stokvels/${stokvelId}/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(body),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(result.error || 'Something went wrong')
      showToast(result.message || 'Saved', 'success')
      if (result.ledgerWarning) showToast(result.ledgerWarning, 'error')
      setPins((p) => ({ ...p, [id]: '' }))
      await load()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setBusyId(null)
    }
  }

  if (!data) return null
  const { joinRequests, expenses } = data
  if (!joinRequests.length && !expenses.length) return null

  const btn = 'text-sm font-bold px-4 py-2.5 rounded-pill disabled:opacity-50'

  return (
    <div className="bg-white rounded-soft border-2 border-ochre/40 p-4 mt-4">
      <h3 className="font-display font-bold text-base text-ink">Izicelo ezilindileyo</h3>
      <p className="text-sm text-ink/70">Requests waiting for an official</p>

      {joinRequests.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-black uppercase tracking-wider text-ink/60">Abafuna ukungena / Want to join</p>
          <ul className="divide-y divide-ink/10">
            {joinRequests.map((r) => (
              <li key={r.id} className="py-3 flex flex-wrap items-center gap-2">
                <span className="flex-1 min-w-[8rem]">
                  <span className="block font-semibold text-ink">{r.name}</span>
                  {r.username && <span className="block text-xs text-ink/50">@{r.username}</span>}
                </span>
                <button type="button" disabled={busyId === r.id}
                  onClick={() => send(r.id, `join-requests/${r.id}`, { approve: true })}
                  className={`${btn} text-white bg-sage`}>
                  Yamkela / Accept
                </button>
                <button type="button" disabled={busyId === r.id}
                  onClick={() => send(r.id, `join-requests/${r.id}`, { approve: false })}
                  className={`${btn} text-terracotta border border-terracotta/40`}>
                  Yala / Decline
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {expenses.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-black uppercase tracking-wider text-ink/60">Iindleko / Expenses to approve</p>
          <ul className="divide-y divide-ink/10">
            {expenses.map((e) => (
              <li key={e.id} className="py-3">
                <p className="font-bold text-ink">{rand(e.amount)} <span className="font-normal text-ink/70">— {e.note}</span></p>
                <p className="text-xs text-ink/50 mb-2">Asked by {e.isMine ? 'you' : e.requestedBy}</p>
                {e.isMine ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-ink/70 flex-1">Waiting for another official to approve.</span>
                    <button type="button" disabled={busyId === e.id}
                      onClick={() => send(e.id, `expenses/${e.id}/decline`)}
                      className={`${btn} text-terracotta border border-terracotta/40`}>
                      Rhoxisa / Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <input
                        type={visiblePins[e.id] ? 'text' : 'password'} inputMode="numeric" maxLength={6} autoComplete="off"
                        aria-label="Your security PIN" placeholder="Your PIN"
                        value={pins[e.id] || ''}
                        onChange={(ev) => setPins({ ...pins, [e.id]: ev.target.value.replace(/\D/g, '').slice(0, 6) })}
                        className="w-28 text-base border border-ink/20 rounded-soft pl-3 pr-10 py-2.5"
                      />
                      <button type="button" onClick={() => setVisiblePins((v) => ({ ...v, [e.id]: !v[e.id] }))} aria-label={visiblePins[e.id] ? 'Hide PIN' : 'Show PIN'} className="absolute inset-y-0 right-0 px-2 flex items-center text-ink-muted">
                        <Icon name={visiblePins[e.id] ? 'eye-off' : 'eye'} size={17} />
                      </button>
                    </div>
                    <button type="button" disabled={busyId === e.id || (pins[e.id] || '').length < 4}
                      onClick={() => send(e.id, `expenses/${e.id}/approve`, { pin: pins[e.id] })}
                      className={`${btn} text-white bg-sage`}>
                      Vuma / Approve
                    </button>
                    <button type="button" disabled={busyId === e.id}
                      onClick={() => send(e.id, `expenses/${e.id}/decline`)}
                      className={`${btn} text-terracotta border border-terracotta/40`}>
                      Yala / Decline
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
