import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'

function AccountSettings({ onBack, onOpenPrivacy }) {
  const { accessToken, logout } = useAuth()
  const { showToast } = useToast()
  const [showDeleteForm, setShowDeleteForm] = useState(false)
  const [password, setPassword] = useState('')
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
        <button onClick={onOpenPrivacy} className="w-full bg-white border-2 border-ink rounded-soft p-4 mb-4 text-left">
          <p className="font-bold text-sm text-ink mb-1">Privacy Policy</p>
          <p className="text-xs text-ink-muted">How iCamagu collects, uses, and protects your information, including your ID number if you verify your identity.</p>
        </button>
      )}

      <div className="bg-white border-2 border-ink rounded-soft p-4 mb-4">
        <p className="font-bold text-sm text-ink mb-1">Export your data</p>
        <p className="text-xs text-ink-muted mb-3">Download everything iCamagu holds about you, as a file.</p>
        <button onClick={exportData} className="w-full bg-sage-500 text-white font-bold py-2.5 rounded-pill text-sm">
          Download My Data
        </button>
      </div>

      <div className="bg-white border-2 border-terracotta rounded-soft p-4">
        <p className="font-bold text-sm text-terracotta mb-1">Delete your account</p>
        <p className="text-xs text-ink-muted mb-3">This is permanent. Financial records stay for audit purposes but are anonymized.</p>

        {!showDeleteForm ? (
          <button onClick={() => setShowDeleteForm(true)} className="w-full border-2 border-terracotta text-terracotta font-bold py-2.5 rounded-pill text-sm">
            Delete My Account
          </button>
        ) : (
          <form onSubmit={deleteAccount} className="space-y-2">
            <input type="password" placeholder="Confirm your password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-ink/30 rounded-soft px-3 py-2 text-sm" />
            <input type="text" placeholder='Type "DELETE MY ACCOUNT"' value={confirmText} onChange={(e) => setConfirmText(e.target.value)}
              className="w-full border border-ink/30 rounded-soft px-3 py-2 text-sm" required />
            {error && <p className="text-terracotta text-xs">{error}</p>}
            <button type="submit" className="w-full bg-terracotta text-white font-bold py-2.5 rounded-pill text-sm">Permanently Delete</button>
          </form>
        )}
      </div>
    </div>
  )
}

export default AccountSettings
