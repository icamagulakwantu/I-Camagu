import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import Icon from '../components/Icon.jsx'

// A small step counter, not literal progress dots — this flow branches
// (password vs. OTP vs. new account) rather than running one fixed
// sequence, so a dot-per-step indicator would misrepresent it. This just
// answers "how far in am I, and is there a way back" at a glance.
const STEP_META = {
  email: { title: 'Sign in', depth: 1 },
  register: { title: 'Create account', depth: 2 },
  'password-login': { title: 'Sign in', depth: 2 },
  'forgot-password': { title: 'Reset password', depth: 3 },
  'otp-login': { title: 'Sign in', depth: 2 },
  'otp-verify': { title: 'Enter code', depth: 3 },
}

function ErrorBanner({ message }) {
  if (!message) return null
  return (
    <div className="flex items-start gap-2 bg-terracotta/10 border border-terracotta/30 rounded-soft px-3 py-2.5">
      <Icon name="close" size={13} color="#c45c26" className="mt-0.5 flex-shrink-0" />
      <p className="text-terracotta text-xs font-bold leading-snug">{message}</p>
    </div>
  )
}

function Login() {
  const [step, setStep] = useState('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [code, setCode] = useState('')
  const [userId, setUserId] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const googleBtnRef = useRef(null)

  const { login } = useAuth()
  const { showToast } = useToast()

  const meta = STEP_META[step]

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
      if (!res.ok) throw new Error(data.detail || data.error || 'Google sign-in failed')
      // A first-time Google sign-in has no Iziduko yet — that's collected
      // as part of Onboarding's ancestry step once they're actually in,
      // not blocking sign-in itself.
      login(data.accessToken, data.user)
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
        body: JSON.stringify({ email, password, firstName, lastName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Registration failed')
      // Iziduko (clan names) is asked in Onboarding's ancestry step now,
      // once someone is actually signed in and there's a reason to give
      // for wanting it — not blocking account creation itself.
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

  return (
    <div className="min-h-screen icamagu-bg flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm bg-white/90 backdrop-blur-md border-2 border-terracotta/25 rounded-soft p-8 shadow-elevated">
        <div className="flex items-center gap-3 mb-1">
          <img src="/icons/source/gateway-mark-1024.png" alt="" className="w-10 h-10 flex-shrink-0" />
          <h1 className="font-display font-bold text-3xl text-ink">iCamagu</h1>
        </div>
        <p className="text-ink-muted text-xs mb-4">Culture before capital.</p>

        {/* Where you are in the flow, and how deep — this screen branches
            (password vs. code vs. new account) rather than running one
            fixed sequence, so this reads as depth-so-far, not a literal
            step-N-of-M count. */}
        {meta && (
          <div className="flex items-center gap-1.5 mb-4">
            {Array.from({ length: meta.depth }).map((_, i) => (
              <div key={i} className={`h-1.5 rounded-pill transition-all ${i === meta.depth - 1 ? 'w-8 bg-terracotta' : 'w-4 bg-terracotta/30'}`} />
            ))}
            <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wide ml-1">{meta.title}</span>
          </div>
        )}

        {step === 'email' && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <p className="font-bold text-sm text-ink">Sign Up or Log In</p>
            <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-ink/30 rounded-soft px-4 py-3" required />
            <ErrorBanner message={error} />
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
            <input type="password" placeholder="Create a password (min 8 characters)" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-ink/30 rounded-soft px-4 py-2.5 text-sm" required minLength={8} />
            <ErrorBanner message={error} />
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
            <ErrorBanner message={error} />
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
            <ErrorBanner message={error} />
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
                  showToast(data.message, 'info')
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
            <ErrorBanner message={error} />
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
            <ErrorBanner message={error} />
            <button type="submit" disabled={loading} className="w-full bg-sage-500 text-white font-bold py-3 rounded-pill disabled:opacity-50">
              {loading ? 'Verifying...' : 'Verify & Log In'}
            </button>
            <button type="button" onClick={() => { setCode(''); setError(''); setStep('otp-login') }} className="w-full text-xs text-ink-muted underline">← Back</button>
          </form>
        )}

      </div>
    </div>
  )
}

export default Login
