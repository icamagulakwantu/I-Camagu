import { useState, useMemo } from 'react'
import Icon from '../components/Icon.jsx'

// Simple, honest strength read — no scoring library, just what actually
// makes a password harder to guess: length past the minimum, and mixing
// character types. Never claims "strong" for anything under 8 characters,
// since that's the server's own floor.
function passwordStrength(pw) {
  if (pw.length === 0) return null
  if (pw.length < 8) return { label: 'Too short', color: 'text-terracotta', bars: 1 }
  let variety = 0
  if (/[a-z]/.test(pw)) variety++
  if (/[A-Z]/.test(pw)) variety++
  if (/[0-9]/.test(pw)) variety++
  if (/[^a-zA-Z0-9]/.test(pw)) variety++
  if (pw.length >= 12 && variety >= 3) return { label: 'Strong', color: 'text-sage-600', bars: 3 }
  if (pw.length >= 8 && variety >= 2) return { label: 'Fair', color: 'text-brand-ochre', bars: 2 }
  return { label: 'Weak', color: 'text-terracotta', bars: 1 }
}

function ResetPassword({ token }) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const strength = useMemo(() => passwordStrength(newPassword), [newPassword])
  const matches = confirmPassword.length > 0 ? confirmPassword === newPassword : null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (newPassword !== confirmPassword) return setError('Passwords do not match')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSuccess(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-sage-500 flex items-center justify-center mb-4">
          <Icon name="check" size={28} color="#fff" strokeWidth={2.5} />
        </div>
        <p className="font-display font-bold text-lg text-ink mb-1">Password reset</p>
        <p className="text-sm text-ink-muted mb-6">You can now sign in with your new password.</p>
        <a href="/" className="bg-sage-500 text-white font-bold px-6 py-3 rounded-pill">Go to iCamagu</a>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm bg-white border-2 border-terracotta/25 rounded-soft p-8">
        <h1 className="font-display font-bold text-2xl text-ink mb-4">Reset Password</h1>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <div className="relative">
              <input type={showNewPassword ? 'text' : 'password'} placeholder="New password (min 8 characters)" value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password"
                className="w-full border border-ink/30 rounded-soft pl-4 pr-12 py-2.5 text-sm" required minLength={8} />
              <button type="button" onClick={() => setShowNewPassword((shown) => !shown)} aria-label={showNewPassword ? 'Hide new password' : 'Show new password'} className="absolute inset-y-0 right-0 px-4 flex items-center text-ink-muted">
                <Icon name={showNewPassword ? 'eye-off' : 'eye'} size={18} />
              </button>
            </div>
            {strength && (
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex gap-1 flex-1">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className={`h-1 flex-1 rounded-pill ${i <= strength.bars ? (strength.bars === 1 ? 'bg-terracotta' : strength.bars === 2 ? 'bg-brand-ochre' : 'bg-sage-500') : 'bg-ink/10'}`} />
                  ))}
                </div>
                <span className={`text-[11px] font-bold ${strength.color}`}>{strength.label}</span>
              </div>
            )}
          </div>
          <div>
            <div className="relative">
              <input type={showConfirmPassword ? 'text' : 'password'} placeholder="Confirm new password" value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password"
                className="w-full border border-ink/30 rounded-soft pl-4 pr-12 py-2.5 text-sm" required />
              <button type="button" onClick={() => setShowConfirmPassword((shown) => !shown)} aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'} className="absolute inset-y-0 right-0 px-4 flex items-center text-ink-muted">
                <Icon name={showConfirmPassword ? 'eye-off' : 'eye'} size={18} />
              </button>
            </div>
            {matches !== null && (
              <p className={`text-[11px] font-bold mt-1 flex items-center gap-1 ${matches ? 'text-sage-600' : 'text-terracotta'}`}>
                {matches ? <><Icon name="check" size={11} color="#4a7a4a" /> Passwords match</> : 'Passwords do not match'}
              </p>
            )}
          </div>
          {error && <p className="text-terracotta text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-sage-500 text-white font-bold py-3 rounded-pill disabled:opacity-50">
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default ResetPassword
