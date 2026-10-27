import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import Icon from '../components/Icon.jsx'

const pressable = 'transition-transform duration-100 ease-out active:scale-[0.96] disabled:opacity-50'

export default function PinSetup({ onBack }) {
  const { accessToken } = useAuth()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [hasPinSet, setHasPinSet] = useState(false)
  const [changing, setChanging] = useState(false)
  const [oldPin, setOldPin] = useState('')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/user/pin/status', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((res) => res.json())
      .then((data) => setHasPinSet(!!data.hasPinSet))
      .catch(() => setError('Could not check PIN status'))
      .finally(() => setLoading(false))
  }, [accessToken])

  const submit = async (e) => {
    e.preventDefault()
    setError('')

    if (!/^\d{4,6}$/.test(pin)) {
      setError('PIN must be 4-6 digits')
      return
    }
    if (pin !== confirmPin) {
      setError('PINs do not match')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/user/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ pin, ...(hasPinSet ? { oldPin } : {}) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not set PIN')
      showToast(hasPinSet ? 'PIN updated' : 'PIN set — you can now confirm contributions and approve payouts', 'success')
      setHasPinSet(true)
      setChanging(false)
      setOldPin('')
      setPin('')
      setConfirmPin('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="px-5 pt-6 pb-28 max-w-md mx-auto">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 text-xs font-bold text-brand-black/60 uppercase tracking-wider flex items-center gap-1"
      >
        ← Back
      </button>
      <h1 className="text-xl font-black text-brand-black mb-1">Security PIN</h1>
      <p className="text-sm text-brand-black/60 mb-6">Required to confirm contributions and approve stokvel payouts.</p>

      {loading ? (
        <p className="text-sm text-ink-muted">Checking...</p>
      ) : hasPinSet && !changing ? (
        <div className="bg-white border-2 border-terracotta/25 rounded-soft p-5">
          <p className="text-sm font-bold text-sage-600 mb-1 flex items-center gap-1.5">
            <Icon name="lock" size={15} color="#4a7a4a" /> PIN is active
          </p>
          <p className="text-xs text-ink-muted mb-4">Your account has a security PIN set.</p>
          <button
            onClick={() => setChanging(true)}
            className={`w-full border-2 border-terracotta/25 font-bold py-2.5 rounded-pill text-sm ${pressable}`}
          >
            Change PIN
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="bg-white border-2 border-terracotta/25 rounded-soft p-5 space-y-3">
          {hasPinSet && (
            <input
              type="password" inputMode="numeric" autoComplete="current-password"
              placeholder="Current PIN" value={oldPin}
              onChange={(e) => setOldPin(e.target.value.replace(/\\D/g, '').slice(0, 6))}
              className="w-full border border-ink/30 rounded-soft px-4 py-3 text-center text-2xl tracking-widest"
              maxLength={6} required
            />
          )}
          <input
            type="password" inputMode="numeric" autoComplete="new-password" placeholder="New PIN (4-6 digits)" value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="w-full border border-ink/30 rounded-soft px-4 py-3 text-center text-2xl tracking-widest"
            maxLength={6}
          />
          <input
            type="password" inputMode="numeric" placeholder="Confirm PIN" value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="w-full border border-ink/30 rounded-soft px-4 py-3 text-center text-2xl tracking-widest"
            maxLength={6}
          />
          {confirmPin.length > 0 && (
            <p className={`text-[11px] font-bold text-center flex items-center justify-center gap-1 ${confirmPin === pin ? 'text-sage-600' : 'text-terracotta'}`}>
              {confirmPin === pin ? <><Icon name="check" size={11} color="#4a7a4a" /> PINs match</> : 'PINs do not match yet'}
            </p>
          )}
          {error && <p className="text-terracotta text-sm">{error}</p>}
          <button
            type="submit" disabled={saving}
            className={`w-full bg-sage-500 text-white font-bold py-3 rounded-pill ${pressable}`}
          >
            {saving ? 'Saving...' : hasPinSet ? 'Update PIN' : 'Set PIN'}
          </button>
          {hasPinSet && (
            <button type="button" onClick={() => { setChanging(false); setError('') }} className="w-full text-xs text-ink-muted underline">
              Cancel
            </button>
          )}
        </form>
      )}
    </div>
  )
}
