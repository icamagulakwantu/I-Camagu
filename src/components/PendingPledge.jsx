import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from './ui/Toast.jsx'
import { PENDING_PLEDGE_KEY } from '../lib/inviteLinks.js'

const pressable = 'transition-transform duration-100 ease-out active:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none'

// Shown after sign-in/registration when the person arrived through a ceremony
// share link and chose to pledge. Asks what they would like to give and saves
// it on the host's plan.
export default function PendingPledge() {
  const { accessToken } = useAuth()
  const { showToast } = useToast()
  const [token, setToken] = useState(null)
  const [plan, setPlan] = useState(null)
  const [item, setItem] = useState('')
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const started = useRef(false)

  useEffect(() => {
    if (!accessToken || started.current) return
    const pending = localStorage.getItem(PENDING_PLEDGE_KEY)
    if (!pending) return
    started.current = true
    fetch(`/api/public/plan/${pending}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error)
        setPlan(data)
        setToken(pending)
      })
      .catch((err) => {
        localStorage.removeItem(PENDING_PLEDGE_KEY)
        showToast(err.message || 'That pledge link is no longer valid', 'error')
      })
  }, [accessToken, showToast])

  const close = () => {
    localStorage.removeItem(PENDING_PLEDGE_KEY)
    setToken(null)
  }

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/public/plan/${token}/pledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ pledgedItem: item, pledgedAmountZAR: amount === '' ? null : amount }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not save your pledge')
      showToast(data.message || 'Pledge added', 'success')
      close()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!token || !plan) return null

  return (
    <div className="fixed inset-0 z-50 bg-ink/50 flex items-end sm:items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-md bg-white rounded-soft p-5 shadow-soft space-y-3">
        <div>
          <h2 className="font-display font-bold text-xl text-ink">Pledge to {plan.title}</h2>
          <p className="text-xs text-ink-muted mt-1">
            {plan.host?.firstName} {plan.host?.lastName} invited you to contribute. Tell them what you would like to give.
          </p>
        </div>
        <input
          type="text"
          placeholder="What will you give? (e.g. Goat, Groceries, Cash)"
          value={item}
          onChange={(e) => setItem(e.target.value)}
          maxLength={200}
          required
          className="w-full border border-ink/30 rounded-soft px-3 py-2 text-sm"
        />
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          placeholder="Value in Rand (optional)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full border border-ink/30 rounded-soft px-3 py-2 text-sm"
        />
        <div className="flex gap-2">
          <button type="submit" disabled={saving} className={`flex-1 bg-sage-500 text-white font-bold py-2.5 rounded-pill text-sm ${pressable}`}>
            {saving ? 'Saving...' : 'Add my pledge'}
          </button>
          <button type="button" onClick={close} disabled={saving} className={`flex-1 border-2 border-terracotta/25 font-bold py-2.5 rounded-pill text-sm ${pressable}`}>
            Not now
          </button>
        </div>
      </form>
    </div>
  )
}
