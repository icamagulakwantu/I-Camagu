import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

function Login() {
  const [step, setStep] = useState('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [paternalIziduko, setPaternalIziduko] = useState('')
  const [maternalIziduko, setMaternalIziduko] = useState('')
  const [code, setCode] = useState('')
  const [userId, setUserId] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const googleBtnRef = useRef(null)

  const { login, updateUser, accessToken } = useAuth()

  useEffect(() => {
    const renderGoogleButton = () => {
      if (!window.google || !googleBtnRef.current || !import.meta.env.VITE_GOOGLE_CLIENT_ID) return
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
      })
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline', size: 'large', width: 320, text: 'continue_with',
      })
    }
    if (window.google) renderGoogleButton()
    else {
      window.addEventListener('load', renderGoogleButton)
      return () => window.removeEventListener('load', renderGoogleButton)
    }
  }, [step])

  const handleGoogleResponse = async (response) => {
    setError(''); setLoading(true)
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify({ idToken: response.credential }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Google sign-in failed')
      login(data.accessToken, data.user)
      if (data.needsIziduko) setStep('iziduko-followup')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEmailSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const res = await fetch('/api/auth/check-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to verify email')
      if (data.exists && data.hasPassword) setStep('password-login')
      else if (data.exists) setStep('otp-login')
      else setStep('register')
    } catch (err) {
      setError(err.message || 'Something went wrong checking email')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordLogin = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const res = await fetch('/api/auth/login-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Invalid credentials')
      login(data.accessToken, data.user)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const res = await fetch('/api/auth/register-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, firstName, lastName, paternalIziduko, maternalIziduko }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Registration failed')
      login(data.accessToken, data.user)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleOtpLogin = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not send verification code')
      setUserId(data.userId)
      setStep('otp-verify')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify({ userId, code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Invalid or expired code')
      login(data.accessToken, data.user)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleIzidukoFollowup = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const res = await fetch('/api/user/iziduko', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        credentials: 'include',
        body: JSON.stringify({ paternalIziduko, maternalIziduko }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save clan details')
      updateUser(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen icamagu-bg flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm bg-white/90 backdrop-blur-md border-2 border-ink rounded-soft p-8 shadow-elevated">
        <div className="h-1.5 w-16 bg-gradient-to-r from-terracotta to-brand-gold rounded-pill mb-6" />
        <h1 className="font-display font-bold text-3xl text-ink mb-1">iCamagu</h1>
        <p className="text-ink-muted text-xs mb-6">Culture before capital.</p>

        {step === 'email' && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <p className="font-bold text-sm text-ink">Sign Up or Log In</p>
            <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-ink/30 rounded-soft px-4 py-3" required />
            {error && <p className="text-terracotta text-sm">{error}</p>}
            <button type="submit" disabled={loading} className="w-full bg-sage-500 text-white font-bold py-3 rounded-pill disabled:opacity-50">
              {loading ? 'Checking...' : 'Continue'}
            </button>
            <div className="flex items-center gap-3 my-2">
              <div className="flex-1 h-px bg-cream-dark" /><span className="text-xs text-ink-muted">or</span><div className="flex-1 h-px bg-cream-dark" />
            </div>
            <div ref={googleBtnRef} className="flex justify-center" />
          </form>
        )}

        {step === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3">
            <p className="font-bold text-sm text-ink">Create your account</p>
            <input type="text" placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)}
              className="w-full border border-ink/30 rounded-soft px-4 py-2.5 text-sm" required />
            <input type="text" placeholder="Surname" value={lastName} onChange={(e) => setLastName(e.target.value)}
              className="w-full border border-ink/30 rounded-soft px-4 py-2.5 text-sm" required />
            <div className="bg-sage-50 border border-sage-200 rounded-soft p-3 space-y-2">
              <p className="text-xs font-black uppercase text-ink-muted">Iziduko</p>
              <input type="text" placeholder="Paternal Iziduko" value={paternalIziduko} onChange={(e) => setPaternalIziduko(e.target.value)}
                className="w-full border border-ink/30 rounded-soft px-3 py-2 text-sm" required />
              <input type="text" placeholder="Maternal Iziduko" value={maternalIziduko} onChange={(e) => setMaternalIziduko(e.target.value)}
                className="w-full border border-ink/30 rounded-soft px-3 py-2 text-sm" required />
            </div>
            <input type="password" placeholder="Create a password (min 8 characters)" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-ink/30 rounded-soft px-4 py-2.5 text-sm" required minLength={8} />
            {error && <p className="text-terracotta text-sm">{error}</p>}
            <button type="submit" disabled={loading} className="w-full bg-sage-500 text-white font-bold py-3 rounded-pill disabled:opacity-50">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
            <button type="button" onClick={() => setStep('email')} className="w-full text-xs text-ink-muted underline">← Back</button>
          </form>
        )}

        {step === 'password-login' && (
          <form onSubmit={handlePasswordLogin} className="space-y-3">
            <p className="font-bold text-sm text-ink">Welcome back</p>
            <p className="text-xs text-ink-muted">{email}</p>
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-ink/30 rounded-soft px-4 py-2.5 text-sm" required />
            {error && <p className="text-terracotta text-sm">{error}</p>}
            <button type="submit" disabled={loading} className="w-full bg-sage-500 text-white font-bold py-3 rounded-pill disabled:opacity-50">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
            <button type="button" onClick={() => setStep('forgot-password')} className="w-full text-xs text-sage-600 underline">Forgot password?</button>
            <button type="button" onClick={() => setStep('email')} className="w-full text-xs text-ink-muted underline">← Back</button>
          </form>
        )}

        {step === 'forgot-password' && (
          <div className="space-y-3">
            <p className="font-bold text-sm text-ink">Reset your password</p>
            <p className="text-xs text-ink-muted">We'll email a reset link to {email}</p>
            {error && <p className="text-terracotta text-sm">{error}</p>}
            <button
              onClick={async () => {
                setLoading(true); setError('')
                try {
                  const res = await fetch('/api/auth/forgot-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email }),
                  })
                  const data = await res.json()
                  if (!res.ok) throw new Error(data.error || 'Could not process request')
                  alert(data.message)
                  setStep('email')
                } catch (err) {
                  setError(err.message)
                } finally {
                  setLoading(false)
                }
              }}
              disabled={loading || !email}
              className="w-full bg-sage-500 text-white font-bold py-3 rounded-pill disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
            <button type="button" onClick={() => setStep('email')} className="w-full text-xs text-ink-muted underline">← Back</button>
          </div>
        )}

        {step === 'otp-login' && (
          <div className="space-y-3">
            <p className="font-bold text-sm text-ink">Welcome back</p>
            <p className="text-xs text-ink-muted">This account uses a login code, not a password.</p>
            {error && <p className="text-terracotta text-sm">{error}</p>}
            <button onClick={handleOtpLogin} disabled={loading} className="w-full bg-sage-500 text-white font-bold py-3 rounded-pill disabled:opacity-50">
              {loading ? 'Sending...' : 'Send me a login code'}
            </button>
            <button type="button" onClick={() => setStep('email')} className="w-full text-xs text-ink-muted underline">← Back</button>
          </div>
        )}

        {step === 'otp-verify' && (
          <form onSubmit={handleVerifyOtp} className="space-y-3">
            <p className="text-ink-muted text-sm">Enter the 6-digit code sent to <strong>{email}</strong></p>
            <input type="text" placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} maxLength={6}
              className="w-full border border-ink/30 rounded-soft px-4 py-3 text-center text-2xl tracking-widest" required />
            {error && <p className="text-terracotta text-sm">{error}</p>}
            <button type="submit" disabled={loading} className="w-full bg-sage-500 text-white font-bold py-3 rounded-pill disabled:opacity-50">
              {loading ? 'Verifying...' : 'Verify & Log In'}
            </button>
          </form>
        )}

        {step === 'iziduko-followup' && (
          <form onSubmit={handleIzidukoFollowup} className="space-y-3">
            <p className="font-bold text-sm text-ink">One more thing</p>
            <p className="text-xs text-ink-muted">We need your Iziduko to complete your profile.</p>
            <input type="text" placeholder="Paternal Iziduko" value={paternalIziduko} onChange={(e) => setPaternalIziduko(e.target.value)}
              className="w-full border border-ink/30 rounded-soft px-4 py-2.5 text-sm" required />
            <input type="text" placeholder="Maternal Iziduko" value={maternalIziduko} onChange={(e) => setMaternalIziduko(e.target.value)}
              className="w-full border border-ink/30 rounded-soft px-4 py-2.5 text-sm" required />
            {error && <p className="text-terracotta text-sm">{error}</p>}
            <button type="submit" disabled={loading} className="w-full bg-sage-500 text-white font-bold py-3 rounded-pill disabled:opacity-50">
              {loading ? 'Saving...' : 'Continue'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default Login
