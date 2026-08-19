import { useState } from 'react'

function ResetPassword({ token }) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

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
        <p className="text-4xl mb-3">✅</p>
        <p className="font-bold text-ink mb-4">Password reset successfully</p>
        <a href="/" className="bg-sage-500 text-white font-bold px-6 py-3 rounded-pill">Go to iCamagu</a>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm bg-white border-2 border-ink rounded-soft p-8">
        <h1 className="font-display font-bold text-2xl text-ink mb-4">Reset Password</h1>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="password" placeholder="New password (min 8 characters)" value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full border border-ink/30 rounded-soft px-4 py-2.5 text-sm" required minLength={8} />
          <input type="password" placeholder="Confirm new password" value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full border border-ink/30 rounded-soft px-4 py-2.5 text-sm" required />
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
