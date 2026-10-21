import { useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from './ui/Toast.jsx'
import PendingPledge from './PendingPledge.jsx'
import { PENDING_STOKVEL_KEY } from '../lib/inviteLinks.js'

// Runs once the person is signed in, registered and past onboarding. Acts on
// any invite link they arrived with:
//  - a stokvel link: joins them to that stokvel and shows them the stokvels
//  - a ceremony pledge link: opens the pledge form (PendingPledge)
export default function PendingStokvelJoin({ onJoined }) {
  const { accessToken } = useAuth()
  const { showToast } = useToast()
  const started = useRef(false)

  useEffect(() => {
    if (!accessToken || started.current) return
    const pendingId = localStorage.getItem(PENDING_STOKVEL_KEY)
    if (!pendingId) return
    started.current = true
    // Cleared first so a failure can never loop on every page load.
    localStorage.removeItem(PENDING_STOKVEL_KEY)

    fetch('/api/stokvels/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ stokvelId: pendingId }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Could not join that stokvel')
        showToast('You have joined the stokvel', 'success')
      })
      .catch((err) => showToast(err.message, 'error'))
      // Either way, show them the stokvels so they can see the result.
      .finally(() => onJoined?.())
  }, [accessToken, showToast, onJoined])

  return <PendingPledge />
}
