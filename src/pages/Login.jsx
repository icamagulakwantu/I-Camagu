import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/ui/Toast.jsx'
import Icon from '../components/Icon.jsx'

// SEC-02: the screen no longer asks the server whether an email has an
// account. After the email step everyone sees the same choices: sign in with
// a password, get a login code by email, or create an account.
const STEP_META = {
  email: { title: 'Sign in', depth: 1 },
  register: { title: 'Create account', depth: 2 },
  'password-login': { title: 'Sign in', depth: 2 },
  'forgot-password': { title: 'Reset password', depth: 3 },
  'otp-verify': { title: 'Enter code', depth: 3 },
}

function ErrorBanner({ message }) {
  if (!message) return null
  return (
    <div role="alert" aria-live="assertive" className="flex items-start gap-2 bg-terracotta/10 border border-terracotta/30 rounded-2xl px-3 py-2.5">
      <Icon name="close" size={13} color="#c45c26" className="mt-0.5 flex-shrink-0" />
      <p className="text-terracotta text-xs font-bold leading-snug">{message}</p>
    </div>
  )
}

function Login() {
  const [step, setStep] = useState('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const googleBtnRef = useRef(null)

  const { login } = useAuth()
  const { showToast } = useToast()

  const meta = STEP_META[step]

  const goTo = (next) => { setError(''); setStep(next) }

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

  // No server call here, on purpose: the next step is the same for everyone.
  const handleEmailSubmit = (e) => {
    e.preventDefault()
    setEmail(email.trim())
    goTo('password-login')
  }

  const handlePasswordLogin = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const res = await fetch('/api/auth/login-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Invalid email or password')
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
      if (data.needsEmailVerification) {
        setCode('')
        setStep('otp-verify')
        showToast('Check your inbox for the verification code.', 'info')
        return
      }
      login(data.accessToken, data.user)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleOtpLogin = async () => {
    setError(''); setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not send a login code')
      setCode('')
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
        credentials: 'include', body: JSON.stringify({ email, code }),
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

        <div className="wash-ember rounded-t-soft px-6 pt-6 pb-5">
          <div className="flex items-center gap-2.5 mb-5">
            <img
              src="/icons/source/gateway-mark-1024.png"
              alt="iCamagu"
              className="w-9 h-9"
              style={{ filter: 'brightness(0) saturate(100%) invert(18%) sepia(28%) saturate(1715%) hue-rotate(335deg) brightness(92%) contrast(91%)' }}
            />
            <span className="font-display font-bold text-2xl text-[#4b281b]">iCamagu</span>
          </div>
          <h1 className="font-display font-bold text-[1.65rem] leading-tight text-[#4b281b] text-balance">
            {step === 'email' && 'Your people. Your plans. Together.'}
            {step === 'register' && 'Joyina iCamagu'}
            {step === 'password-login' && 'Wamkelekile'}
            {step === 'forgot-password' && 'Reset your password'}
            {step === 'otp-verify' && 'Check your inbox'}
          </h1>
          {step === 'register' && <p className="text-[#4b281b]/85 text-sm mt-1">Join iCamagu</p>}
          {step === 'password-login' && <p className="text-[#4b281b]/85 text-sm mt-1">Welcome back</p>}
          <p className="text-[#4b281b]/90 text-sm mt-2 leading-snug break-words">
            {step === 'email' && 'Plan ceremonies, organise your stokvel and buy together in one place.'}
            {step === 'register' && `Create your account for ${email}.`}
            {step === 'password-login' && email}
            {step === 'forgot-password' && `We'll send a reset link to ${email}`}
            {step === 'otp-verify' && `If an iCamagu account uses ${email}, we've sent it a 6-digit code.`}
          </p>
          {step === 'email' && (
            <div className="mt-4 rounded-2xl border border-[#4b281b]/15 bg-white/45 px-3.5 py-3">
              <p className="text-[#4b281b] text-sm font-bold">Livestock group-buy offer</p>
              <p className="text-[#4b281b]/90 text-xs leading-snug mt-0.5">Save up to 20% on eligible livestock orders when your community buys together. Final savings depend on the supplier and group order.</p>
            </div>
          )}
        </div>

        <div className="bg-white/95 backdrop-blur-md border-x-2 border-b-2 border-terracotta/20 rounded-b-soft px-6 py-6 shadow-elevated">

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
                  placeholder="Your email address" aria-label="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border-2 border-terracotta/20 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-terracotta/60 focus:ring-2 focus:ring-terracotta/10 transition-all"
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
                Continue with email →
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
                    setError('Enter a valid email address first.')
                    return
                  }
                  setEmail(email.trim())
                  setPassword('')
                  goTo('register')
                }}
                className="w-full border-2 border-terracotta/30 text-terracotta font-bold py-3 rounded-pill text-sm pressable"
              >
                Create an account
              </button>
              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px bg-cream-dark" />
                <span className="text-xs text-ink-muted">or sign in with</span>
                <div className="flex-1 h-px bg-cream-dark" />
              </div>
              <div ref={googleBtnRef} className="flex justify-center" />
              <p className="text-center text-[11px] text-ink-muted pt-1">
                Free to join · No card required
              </p>
            </form>
          )}

          {step === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text" placeholder="First name" aria-label="First name" value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full border-2 border-terracotta/20 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:border-terracotta/60 transition-all"
                  required
                />
                <input
                  type="text" placeholder="Surname" aria-label="Surname" value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full border-2 border-terracotta/20 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:border-terracotta/60 transition-all"
                  required
                />
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'} placeholder="Create a password (min 8 characters)" aria-label="Create password" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full border-2 border-terracotta/20 rounded-2xl pl-4 pr-12 py-2.5 text-sm focus:outline-none focus:border-terracotta/60 transition-all"
                  required minLength={8}
                />
                <button type="button" onClick={() => setShowPassword((shown) => !shown)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute inset-y-0 right-0 px-4 flex items-center text-ink-muted">
                  <Icon name={showPassword ? 'eye-off' : 'eye'} size={18} />
                </button>
              </div>
              <ErrorBanner message={error} />
              <button
                type="submit" disabled={loading}
                className="w-full wash-ember text-white font-bold py-3.5 rounded-pill disabled:opacity-50 pressable shadow-terracotta"
              >
                {loading ? 'Creating account...' : 'Create Account →'}
              </button>
              <button type="button" onClick={() => goTo('password-login')} className="w-full text-xs text-ink-muted underline">
                ← I already have an account
              </button>
            </form>
          )}

          {step === 'password-login' && (
            <div className="space-y-3">
              <form onSubmit={handlePasswordLogin} className="space-y-3">
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'} placeholder="Your password" aria-label="Password" value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="w-full border-2 border-terracotta/20 rounded-2xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-terracotta/60 focus:ring-2 focus:ring-terracotta/10 transition-all"
                    required autoFocus
                  />
                  <button type="button" onClick={() => setShowPassword((shown) => !shown)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute inset-y-0 right-0 px-4 flex items-center text-ink-muted">
                    <Icon name={showPassword ? 'eye-off' : 'eye'} size={18} />
                  </button>
                </div>
                <ErrorBanner message={error} />
                <button
                  type="submit" disabled={loading}
                  className="w-full wash-ember text-white font-bold py-3.5 rounded-pill disabled:opacity-50 pressable shadow-terracotta"
                >
                  {loading ? 'Signing in...' : 'Sign In →'}
                </button>
              </form>
              <button
                type="button" onClick={handleOtpLogin} disabled={loading}
                className="w-full border-2 border-terracotta/30 text-terracotta font-bold py-3 rounded-pill disabled:opacity-50 pressable text-sm"
              >
                {loading ? 'Sending...' : 'No password? Email me a login code'}
              </button>
              <button
                type="button" onClick={() => goTo('forgot-password')}
                className="w-full text-xs text-terracotta font-semibold underline"
              >
                Forgot password?
              </button>
              <div className="flex items-center gap-3 pt-1">
                <div className="flex-1 h-px bg-cream-dark" />
                <span className="text-xs text-ink-muted">New to iCamagu?</span>
                <div className="flex-1 h-px bg-cream-dark" />
              </div>
              <button
                type="button" onClick={() => { setPassword(''); goTo('register') }}
                className="w-full text-sm text-terracotta font-bold underline"
              >
                Create an account
              </button>
              <button type="button" onClick={() => goTo('email')} className="w-full text-xs text-ink-muted underline">
                ← Use a different email
              </button>
            </div>
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
              <button type="button" onClick={() => goTo('password-login')} className="w-full text-xs text-ink-muted underline">
                ← Back
              </button>
            </div>
          )}

          {step === 'otp-verify' && (
            <form onSubmit={handleVerifyOtp} className="space-y-3">
              <input
                type="text" inputMode="numeric" autoComplete="one-time-code"
                placeholder="123456" aria-label="Six-digit email verification code" value={code}
                onChange={(e) => setCode(e.target.value)} maxLength={6}
                className="w-full border-2 border-terracotta/20 rounded-2xl px-4 py-4 text-center text-2xl tracking-[0.4em] font-bold focus:outline-none focus:border-terracotta/60 focus:ring-2 focus:ring-terracotta/10 transition-all"
                required autoFocus
              />
              <ErrorBanner message={error} />
              <button
                type="submit" disabled={loading}
                className="w-full wash-ember text-white font-bold py-3.5 rounded-pill disabled:opacity-50 pressable shadow-terracotta"
              >
                {loading ? 'Verifying...' : 'Verify & Log In →'}
              </button>
              <p className="text-center text-[11px] text-ink-muted">
                No email after a few minutes? Check your spam folder, or create an account if you are new.
              </p>
              <button
                type="button"
                onClick={() => { setCode(''); goTo('password-login') }}
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
