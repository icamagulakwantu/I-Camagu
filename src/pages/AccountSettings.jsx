import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import Icon from '../components/Icon.jsx'

function AccountSettings({ onBack, onOpenPrivacy }) {
  const { accessToken, logout } = useAuth()
  const { showToast } = useToast()
  const [showDeleteForm, setShowDeleteForm] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [error, setError] = useState('')

  const exportData = async () => {
    try {
      const res = await fetch('/api/account/export', { headers: { Authorization: `Bearer ${accessToken}` } })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not export data')
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'my-icamagu-data.json'; a.click()
      URL.revokeObjectURL(url)
      showToast('Your data has been downloaded', 'success')
    } catch (err) {
      showToast(err.message || 'Could not export data', 'error')
    }
  }

  const deleteAccount = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ password, confirmText }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showToast('Account deleted', 'info')
      await logout()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="min-h-screen pb-24 bg-cream px-4 pt-6">
      <button onClick={onBack} className="text-sm text-ink-muted mb-4">← Back</button>
      <h2 className="font-display font-bold text-2xl text-ink mb-4">Account & Privacy</h2>

      {onOpenPrivacy && (
        <button onClick={onOpenPrivacy} className="w-full bg-white border-2 border-terracotta/25 rounded-soft p-4 mb-4 text-left">
          <p className="font-bold text-sm text-ink mb-1">Privacy Policy</p>
          <p className="text-xs text-ink-muted">How iCamagu collects, uses, and protects your information, including your ID number if you verify your identity.</p>
        </button>
      )}

      <div className="bg-white border-2 border-terracotta/25 rounded-soft p-4 mb-4">
        <p className="font-bold text-sm text-ink mb-1">Export your data</p>
        <p className="text-xs text-ink-muted mb-3">Download everything iCamagu holds about you, as a file.</p>
        <button onClick={exportData} className="w-full bg-sage-500 text-white font-bold py-2.5 rounded-pill text-sm">
          Download My Data
        </button>
      </div>

      {/* Separated from the actions above by real distance and a distinct
          wash background, not just a thicker border on an otherwise
          identical white card — this is the one action here that can't be
          undone. */}
      <div className="mt-8">
        <p className="text-[10px] font-black uppercase tracking-wider text-terracotta mb-2">Danger zone</p>
        <div className="bg-terracotta/5 border-2 border-terracotta rounded-soft p-4">
          <p className="font-bold text-sm text-terracotta mb-2">Delete your account</p>
          <ul className="text-xs text-ink-muted mb-3 space-y-1 list-disc pl-4">
            <li>Your profile, stokvel memberships and ceremony plans are permanently deleted.</li>
            <li>Financial records are kept but anonymized, as required for audit purposes.</li>
            <li>This cannot be undone.</li>
          </ul>

          {!showDeleteForm ? (
            <button onClick={() => setShowDeleteForm(true)} className="w-full border-2 border-terracotta text-terracotta font-bold py-2.5 rounded-pill text-sm">
              Delete My Account
            </button>
          ) : (
            <form onSubmit={deleteAccount} className="space-y-2">
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} placeholder="Confirm your password" aria-label="Confirm your password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-ink/30 rounded-soft pl-3 pr-12 py-2 text-sm bg-white" required />
                <button type="button" onClick={() => setShowPassword((shown) => !shown)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute inset-y-0 right-0 px-4 flex items-center text-ink-muted">
                  <Icon name={showPassword ? 'eye-off' : 'eye'} size={18} />
                </button>
              </div>
              <input type="text" placeholder='Type "DELETE MY ACCOUNT"' value={confirmText} onChange={(e) => setConfirmText(e.target.value)}
                className="w-full border border-ink/30 rounded-soft px-3 py-2 text-sm bg-white" required />
              {error && <p className="text-terracotta text-xs">{error}</p>}
              <button type="submit" className="w-full bg-terracotta text-white font-bold py-2.5 rounded-pill text-sm">Permanently Delete</button>
              <button type="button" onClick={() => { setShowDeleteForm(false); setError(''); setPassword(''); setConfirmText('') }} className="w-full text-xs text-ink-muted underline py-1">
                Cancel
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default AccountSettings
