import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from './ui/Toast.jsx'

const pressable = 'transition-transform duration-100 ease-out active:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none'

// Shown at the top of the Stokvels screen: invitations other people sent you,
// each with a big Accept and Decline. Renders nothing when there are none.
export default function MyStokvelInvites({ onJoined }) {
  const { accessToken } = useAuth()
  const { showToast } = useToast()
  const [invites, setInvites] = useState([])
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/stokvels/invites/mine', { headers: { Authorization: `Bearer ${accessToken}` } }).catch(() => null)
    if (res?.ok) setInvites(await res.json())
  }, [accessToken])

  useEffect(() => { load() }, [load])

  const answer = async (invite, accept) => {
    setBusyId(invite.id)
    try {
      const res = await fetch(`/api/stokvels/invites/${invite.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ accept }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Could not save your answer')
      showToast(body.message, 'success')
      setInvites((list) => list.filter((i) => i.id !== invite.id))
      if (accept) onJoined?.()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setBusyId(null)
    }
  }

  if (invites.length === 0) return null

  return (
    <div className="mb-4 space-y-3">
      {invites.map((invite) => (
        <div key={invite.id} className="bg-white border-2 border-terracotta rounded-soft p-4 shadow-soft">
          <p className="text-[10px] font-black uppercase tracking-widest text-terracotta">You are invited</p>
          <p className="font-display font-bold text-lg text-ink mt-1">{invite.stokvelName}</p>
          <p className="text-sm text-ink-muted">{invite.invitedBy} invited you to join this stokvel.</p>
          <div className="flex gap-2 mt-3">
            <button type="button" disabled={busyId === invite.id} onClick={() => answer(invite, true)}
              className={`flex-1 bg-sage-500 text-white font-bold py-3 rounded-pill text-base ${pressable}`}>
              Join
            </button>
            <button type="button" disabled={busyId === invite.id} onClick={() => answer(invite, false)}
              className={`flex-1 border-2 border-terracotta/40 text-ink font-bold py-3 rounded-pill text-base ${pressable}`}>
              No thanks
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
