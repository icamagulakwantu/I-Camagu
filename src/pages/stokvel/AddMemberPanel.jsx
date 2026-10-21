import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../components/ui/Toast.jsx'

const pressable = 'transition-transform duration-100 ease-out active:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none'

// "Add someone": find a person already on iCamagu (your family connections
// show first, or search by name) and send them an invitation. They are only
// added once they accept, like adding someone to a WhatsApp group.
export default function AddMemberPanel({ stokvelId }) {
  const { accessToken } = useAuth()
  const { showToast } = useToast()
  const [query, setQuery] = useState('')
  const [people, setPeople] = useState(null)
  const [waiting, setWaiting] = useState([])
  const [busyId, setBusyId] = useState(null)

  const loadWaiting = useCallback(async () => {
    const res = await fetch(`/api/stokvels/${stokvelId}/invites`, { headers: { Authorization: `Bearer ${accessToken}` } }).catch(() => null)
    if (res?.ok) setWaiting(await res.json())
  }, [stokvelId, accessToken])

  useEffect(() => { loadWaiting() }, [loadWaiting])

  // Waits for a pause in typing before asking the server, and ignores a
  // slow answer that arrives after a newer search.
  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(async () => {
      const text = query.trim()
      const res = await fetch(
        `/api/stokvels/invites/search?stokvelId=${encodeURIComponent(stokvelId)}&q=${encodeURIComponent(text)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      ).catch(() => null)
      const data = res?.ok ? await res.json() : []
      if (!cancelled) setPeople(data)
    }, query ? 400 : 0)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [query, stokvelId, accessToken])

  const invite = async (person) => {
    setBusyId(person.userId)
    try {
      const res = await fetch(`/api/stokvels/${stokvelId}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ userId: person.userId }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Could not send the invitation')
      showToast(body.message || 'Invitation sent', 'success')
      loadWaiting()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setBusyId(null)
    }
  }

  const waitingNames = new Set(waiting.map((w) => w.name))

  return (
    <div className="mb-4 pb-4 border-b border-terracotta/15">
      <p className="text-[10px] font-black uppercase tracking-wider text-ink-muted mb-1">Add someone</p>
      <p className="text-xs text-ink-muted mb-2">
        Type a name. Your family from the iziduko network show first. They get a message and choose to join.
      </p>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name"
        className="w-full border border-ink/30 rounded-soft px-3 py-3 text-base focus:outline-none focus:border-sage-500"
      />

      <ul className="mt-2 divide-y divide-cream-dark bg-white border border-terracotta/15 rounded-soft">
        {people === null && <li className="p-3 text-sm text-ink-muted">Looking...</li>}
        {people?.length === 0 && (
          <li className="p-3 text-sm text-ink-muted">
            {query.trim() ? 'Nobody found. Send them the invite link below instead.' : 'No family connections yet. Search by name, or use the invite link below.'}
          </li>
        )}
        {people?.map((p) => (
          <li key={p.userId} className="flex items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-ink truncate">{p.name}</p>
              <p className="text-[11px] text-ink-muted">{p.isFamily ? 'Family connection' : p.username ? `@${p.username}` : ''}</p>
            </div>
            {p.alreadyMember ? (
              <span className="text-xs font-semibold text-ink-muted">Already in</span>
            ) : waitingNames.has(p.name) ? (
              <span className="text-xs font-semibold text-ink-muted">Waiting</span>
            ) : (
              <button type="button" disabled={busyId === p.userId} onClick={() => invite(p)}
                className={`bg-sage-500 text-white font-bold text-sm px-4 py-2 rounded-pill ${pressable}`}>
                Invite
              </button>
            )}
          </li>
        ))}
      </ul>

      {waiting.length > 0 && (
        <p className="text-xs text-ink-muted mt-2">
          Waiting for an answer: {waiting.map((w) => w.name).join(', ')}
        </p>
      )}
    </div>
  )
}
