import { useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from './ui/Toast.jsx'
import { PENDING_CLAN_KEY } from '../lib/inviteLinks.js'

// Runs once the person is inside the app. If they arrived through a clan
// group invite link, add them to that group and take them to it.
// Renders nothing.
export default function PendingClanJoin({ onJoined }) {
  const { accessToken } = useAuth()
  const { showToast } = useToast()
  const started = useRef(false)

  useEffect(() => {
    if (!accessToken || started.current) return
    const code = localStorage.getItem(PENDING_CLAN_KEY)
    if (!code) return
    started.current = true
    // Cleared first so a failure can never loop on every page load.
    localStorage.removeItem(PENDING_CLAN_KEY)

    fetch('/api/iziduko/groups/join-by-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ code }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Could not join that clan group')
        showToast(data.message || 'You have joined the clan group', 'success')
        onJoined?.(data.id)
      })
      .catch((err) => showToast(err.message, 'error'))
  }, [accessToken, showToast, onJoined])

  return null
}
