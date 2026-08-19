import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

function PinReminder({ onNavigate }) {
  const { accessToken } = useAuth()
  const [hasPinSet, setHasPinSet] = useState(true)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!accessToken) return
    fetch('/api/user/pin/status', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(res => res.json())
      .then(data => setHasPinSet(data.hasPinSet))
      .catch(() => {})
  }, [accessToken])

  if (hasPinSet || dismissed) return null

  return (
    <div className="bg-terracotta/10 border-2 border-terracotta rounded-soft p-3 mb-4 flex items-center gap-3">
      <span className="text-xl">🔐</span>
      <div className="flex-1">
        <p className="text-xs font-bold text-ink">Set your security PIN</p>
        <p className="text-[11px] text-ink-muted">Needed before you can approve payouts or confirm contributions.</p>
      </div>
      <button onClick={() => onNavigate('pin')} className="text-xs bg-terracotta text-white font-bold px-3 py-1.5 rounded-pill flex-shrink-0">Set now</button>
      <button onClick={() => setDismissed(true)} className="text-ink-muted text-sm flex-shrink-0">✕</button>
    </div>
  )
}

export default PinReminder
