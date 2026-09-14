import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

function Username() {
  const [username, setUsernameInput] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  // null = not checked yet (too short, or nothing typed), true/false once a
  // live check for the current value has come back.
  const [checking, setChecking] = useState(false)
  const [available, setAvailable] = useState(null)
  const debounceRef = useRef(null)

  const { accessToken, updateUser, logout } = useAuth()

  useEffect(() => {
    setAvailable(null)
    setError('')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (username.trim().length < 3) {
      setChecking(false)
      return
    }
    setChecking(true)
    debounceRef.current = setTimeout(() => {
      fetch(`/api/user/username/available?username=${encodeURIComponent(username.trim())}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
        .then((res) => res.json())
        .then((data) => setAvailable(data.available))
        .catch(() => setAvailable(null))
        .finally(() => setChecking(false))
    }, 400)
    return () => clearTimeout(debounceRef.current)
  }, [username, accessToken])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/user/username', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ username }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not set username')
      updateUser({ username: data.username })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const trimmed = username.trim()
  const tooShort = trimmed.length > 0 && trimmed.length < 3
  const canSubmit = trimmed.length >= 3 && available === true && !checking

  return (
    <div className="icamagu-bg flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm bg-white border-3 border-terracotta/25 rounded-soft p-8">
        <button
          type="button"
          onClick={logout}
          className="text-sm text-brand-black/50 mb-4 -ml-1 px-1 py-2"
        >
          ← Back to sign in
        </button>
        <div className="h-1.5 w-16 bg-brand-ochre rounded-pill mb-6"></div>
        <h2 className="text-2xl font-extrabold text-brand-black mb-2">
          One last thing
        </h2>
        <p className="text-brand-black/60 text-sm mb-1">
          Choose a username — this is how other members will see you in stokvels and community groups.
        </p>
        <p className="text-brand-black/40 text-xs mb-6">
          At least 3 characters, and it needs to be free — we'll check as you type.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="Choose a username"
              value={username}
              onChange={(e) => setUsernameInput(e.target.value)}
              className={`w-full border rounded-soft px-4 py-3 bg-white focus:outline-none ${
                available === false || tooShort
                  ? 'border-brand-ochre focus:border-brand-ochre'
                  : available === true
                  ? 'border-sage-500 focus:border-sage-500'
                  : 'border-brand-black/30 focus:border-brand-blue'
              }`}
              required
              minLength={3}
              autoFocus
            />
            <div className="min-h-[18px] mt-1.5">
              {tooShort ? (
                <p className="text-brand-ochre text-xs">Needs at least 3 characters</p>
              ) : checking ? (
                <p className="text-brand-black/40 text-xs">Checking availability...</p>
              ) : available === true ? (
                <p className="text-sage-600 text-xs font-bold">✓ Available</p>
              ) : available === false ? (
                <p className="text-brand-ochre text-xs font-bold">Already taken — try another</p>
              ) : null}
            </div>
          </div>
          {error && <p className="text-brand-ochre text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading || !canSubmit}
            className="w-full bg-brand-blue text-brand-cream font-bold py-3 rounded-pill disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Username
