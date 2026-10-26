import { useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from './ui/Toast.jsx'
import PendingPledge from './PendingPledge.jsx'
import { PENDING_STOKVEL_KEY } from '../lib/inviteLinks.js'

// Handles stokvel invites after sign-in and also renders the pending ceremony
// pledge flow. A stokvel invite may require an official's approval.
export default function PendingStokvelJoin({ onJoined }) {
  const { accessToken } = useAuth()
  const { showToast } = useToast()
  const started = useRef(false)

  useEffect(() => {
    if (!accessToken || started.current) return
    const pendingId = localStorage.getItem(PENDING_STOKVEL_KEY)
    if (!pendingId) return
    started.current = true
    // Clear first so a failure cannot loop on every page load.
    localStorage.removeItem(PENDING_STOKVEL_KEY)

    fetch('/api/stokvels/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ stokvelId: pendingId }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (data.requested) {
          showToast(data.error || 'Request sent. An official must accept you first.', 'info')
          return
        }
        if (!res.ok) throw new Error(data.error || 'Could not join that stokvel')
        showToast('You have joined the stokvel', 'success')
      })
      .catch((err) => showToast(err.message, 'error'))
      .finally(() => onJoined?.())
  }, [accessToken, showToast, onJoined])

  return <PendingPledge />
}
