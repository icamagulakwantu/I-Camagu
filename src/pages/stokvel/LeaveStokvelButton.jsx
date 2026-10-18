import { useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useToast } from '../../components/ui/Toast.jsx'

const pressable = "transition-transform duration-100 ease-out active:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none"

/**
 * Leave Stokvel button — shown to non-organiser members only.
 * On success, calls onLeft() so the parent can navigate back to the list.
 */
function LeaveStokvelButton({ stokvelId, stokvelName, isOrganiser, onLeft }) {
  const { accessToken } = useAuth()
  const { showToast } = useToast()
  const [confirm, setConfirm] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  if (isOrganiser) return null

  const leaveStokvel = async () => {
    setIsLeaving(true)
    try {
      const res = await fetch(`/api/stokvels/${stokvelId}/leave`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not leave stokvel')
      showToast(data.message || `You have left ${stokvelName}`, 'info')
      onLeft?.()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setIsLeaving(false)
      setConfirm(false)
    }
  }

  return (
    <div className="mt-6 pt-4 border-t border-terracotta/15">
      <p className="text-[10px] font-black uppercase tracking-wider text-terracotta mb-2">Leave group</p>
      {!confirm ? (
        <button
          type="button"
          onClick={() => setConfirm(true)}
          className={`w-full border-2 border-terracotta/50 text-terracotta font-bold py-2.5 rounded-pill text-sm flex items-center justify-center gap-1.5 ${pressable}`}
        >
          Leave this stokvel
        </button>
      ) : (
        <div className="bg-terracotta/5 border-2 border-terracotta rounded-soft p-4 animate-fade-in">
          <p className="text-sm font-bold text-ink mb-1">Leave "{stokvelName}"?</p>
          <p className="text-xs text-ink-muted mb-3">
            You will be removed from the group. Your financial history stays on record.
            You cannot leave if you have an open loan or pending payout.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={leaveStokvel}
              disabled={isLeaving}
              className={`flex-1 bg-terracotta text-white font-bold py-2 rounded-pill text-sm ${pressable}`}
            >
              {isLeaving ? 'Leaving…' : 'Yes, leave'}
            </button>
            <button
              type="button"
              onClick={() => setConfirm(false)}
              disabled={isLeaving}
              className={`flex-1 border-2 border-terracotta/25 font-bold py-2 rounded-pill text-sm ${pressable}`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default LeaveStokvelButton
