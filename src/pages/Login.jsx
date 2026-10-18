import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import Icon from '../components/Icon.jsx'

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
    <div className="flex items-start gap-2 bg-terracotta/10 border border-terracotta/30 rounded-2xl px-3 py-2.5">
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
    <div className="min-h-screen icamagu-bg flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm animate-slide-up">

        {/* Hero header — matches the onboarding welcome tone */}
        <div className="wash-ember rings rounded-t-soft px-6 pt-7 pb-6">
          <div className="flex items-center gap-2.5 mb-4">
            <img
              src="/icons/source/gateway-mark-1024.png"
              alt="iCamagu"
              className="w-9 h-9"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
            <span className="font-display font-bold text-2xl text-white">iCamagu</span>
          </div>
          <h1 className="font-display font-bold text-[1.55rem] leading-tight text-white">
            {step === 'email' && 'Plan your ceremony. Buy in bulk. Save together.'}
            {step === 'register' && 'Join iCamagu'}
            {step === 'password-login' && 'Welcome back'}
            {step === 'forgot-password' && 'Reset your password'}
            {step === 'otp-login' && 'Welcome back'}
            {step === 'otp-verify' && 'Check your inbox'}
          </h1>
          <p className="text-white/70 text-sm mt-1.5">
            {step === 'email' && 'Culture before capital.'}
            {step === 'register' && 'Create your account below.'}
            {step === 'password-login' && email}
            {step === 'forgot-password' && `We'll send a reset link to ${email}`}
            {step === 'otp-login' && 'This account uses a one-time login code.'}
            {step === 'otp-verify' && `Enter the 6-digit code sent to ${email}`}
          </p>
        </div>

        {/* Form card */}
        <div className="bg-white/95 backdrop-blur-md border-x-2 border-b-2 border-terracotta/20 rounded-b-soft px-6 py-6 shadow-elevated">

          {/* Depth indicator for sub-steps */}
          {meta && step !== 'email' && (
            <div className="flex items-center gap-1.5 mb-5">
              {Array.from({ length: meta.depth }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-pill transition-all ${
                    i === meta.depth - 1 ? 'w-8 bg-terracotta' : 'w-4 bg-terracotta/30'
                  }`}
                />
              ))}
              <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wide ml-1">{meta.title}</span>
            </div>
          )}

          {step === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="relative">
                <input
                  type="email"
                  placeholder="Your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-ink/20 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-terracotta/60 focus:ring-2 focus:ring-terracotta/10 transition-all"
                  required
                  autoFocus
                />
              </div>
              <ErrorBanner message={error} />
              <button
                type="submit"
                disabled={loading}
                className="w-full wash-ember text-white font-bold py-3.5 rounded-pill disabled:opacity-50 text-[15px] pressable shadow-terracotta"
              >
                {loading ? 'Checking...' : 'Continue →'}
              </button>
              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px bg-cream-dark" />
                <span className="text-xs text-ink-muted">or sign in with</span>
                <div className="flex-1 h-px bg-cream-dark" />
              </div>
              <div ref={googleBtnRef} className="flex justify-center" />
              <p className="text-center text-[10px] text-ink-muted pt-1">
                Free to join. No card required.
              </p>
            </form>
          )}

          {step === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text" placeholder="First name" value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full border border-ink/20 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:border-terracotta/60 transition-all"
                  required
                />
                <input
                  type="text" placeholder="Surname" value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full border border-ink/20 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:border-terracotta/60 transition-all"
                  required
                />
              </div>
              <input
                type="password" placeholder="Create a password (min 8 characters)" value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-ink/20 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:border-terracotta/60 transition-all"
                required minLength={8}
              />
              <ErrorBanner message={error} />
              <button
                type="submit" disabled={loading}
                className="w-full wash-ember text-white font-bold py-3.5 rounded-pill disabled:opacity-50 pressable shadow-terracotta"
              >
                {loading ? 'Creating account...' : 'Create Account →'}
              </button>
              <button type="button" onClick={() => setStep('email')} className="w-full text-xs text-ink-muted underline">
                ← Back
              </button>
            </form>
          )}

          {step === 'password-login' && (
            <form onSubmit={handlePasswordLogin} className="space-y-3">
              <input
                type="password" placeholder="Your password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-ink/20 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-terracotta/60 focus:ring-2 focus:ring-terracotta/10 transition-all"
                required autoFocus
              />
              <ErrorBanner message={error} />
              <button
                type="submit" disabled={loading}
                className="w-full wash-ember text-white font-bold py-3.5 rounded-pill disabled:opacity-50 pressable shadow-terracotta"
              >
                {loading ? 'Signing in...' : 'Sign In →'}
              </button>
              <button
                type="button" onClick={() => setStep('forgot-password')}
                className="w-full text-xs text-terracotta font-semibold underline"
              >
                Forgot password?
              </button>
              <button type="button" onClick={() => setStep('email')} className="w-full text-xs text-ink-muted underline">
                ← Back
              </button>
            </form>
          )}

          {step === 'forgot-password' && (
            <div className="space-y-3">
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
                className="w-full wash-ember text-white font-bold py-3.5 rounded-pill disabled:opacity-50 pressable shadow-terracotta"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
              <button type="button" onClick={() => setStep('email')} className="w-full text-xs text-ink-muted underline">
                ← Back
              </button>
            </div>
          )}

          {step === 'otp-login' && (
            <div className="space-y-3">
              <ErrorBanner message={error} />
              <button
                onClick={handleOtpLogin} disabled={loading}
                className="w-full wash-ember text-white font-bold py-3.5 rounded-pill disabled:opacity-50 pressable shadow-terracotta"
              >
                {loading ? 'Sending...' : 'Send me a login code →'}
              </button>
              <button type="button" onClick={() => setStep('email')} className="w-full text-xs text-ink-muted underline">
                ← Back
              </button>
            </div>
          )}

          {step === 'otp-verify' && (
            <form onSubmit={handleVerifyOtp} className="space-y-3">
              <input
                type="text" placeholder="123456" value={code}
                onChange={(e) => setCode(e.target.value)} maxLength={6}
                className="w-full border border-ink/20 rounded-2xl px-4 py-4 text-center text-2xl tracking-[0.4em] font-bold focus:outline-none focus:border-terracotta/60 focus:ring-2 focus:ring-terracotta/10 transition-all"
                required autoFocus
              />
              <ErrorBanner message={error} />
              <button
                type="submit" disabled={loading}
                className="w-full wash-ember text-white font-bold py-3.5 rounded-pill disabled:opacity-50 pressable shadow-terracotta"
              >
                {loading ? 'Verifying...' : 'Verify & Log In →'}
              </button>
              <button
                type="button"
                onClick={() => { setCode(''); setError(''); setStep('otp-login') }}
                className="w-full text-xs text-ink-muted underline"
              >
                ← Back
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default Login
