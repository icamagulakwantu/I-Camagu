import { createContext, useContext, useState, useEffect, useRef } from 'react'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(null)
  const [user, setUser] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [debugInfo, setDebugInfo] = useState('')
  // The refresh endpoint rotates the refresh cookie and revokes the token it
  // was called with — presenting the same (now-revoked) token twice, which
  // is exactly what happens if two triggers (the interval, a tab regaining
  // focus, visibilitychange) fire close together, reads server-side as
  // token reuse and wipes out every one of the user's sessions as a
  // suspected compromise. Sharing one in-flight promise across triggers
  // means a second, near-simultaneous call gets the same result instead of
  // making its own doomed request.
  const refreshInFlight = useRef(null)

  const silentRefresh = () => {
    if (refreshInFlight.current) return refreshInFlight.current

    const promise = fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) {
          const err = new Error(res.status === 401 ? 'Session expired' : 'Session refresh temporarily unavailable')
          err.status = res.status
          throw err
        }
        const data = await res.json()
        if (!data.accessToken) {
          const err = new Error('Invalid session data')
          err.status = 401
          throw err
        }
        setAccessToken(data.accessToken)
        setUser(data.user)
        setDebugInfo('')
        return true
      })
      .catch((err) => {
        setDebugInfo(err.message)
        // Only a definitive authentication failure should clear an existing
        // session. Network errors and 5xx responses are transient; keep the
        // current access token/user so a short outage doesn't log the member out.
        if (err.status === 401) {
          setAccessToken(null)
          setUser(null)
        }
        return false
      })
      .finally(() => {
        refreshInFlight.current = null
      })

    refreshInFlight.current = promise
    return promise
  }

  useEffect(() => {
    silentRefresh().finally(() => setCheckingSession(false))
  }, [])

  // The access token expires after 15 minutes server-side; refresh it well
  // before that so a long testing/usage session doesn't suddenly 401 everywhere.
  useEffect(() => {
    if (!accessToken) return
    const interval = setInterval(() => { silentRefresh() }, 10 * 60 * 1000)
    return () => clearInterval(interval)
  }, [accessToken])

  // Mobile browsers throttle or fully suspend setInterval timers while a tab
  // is backgrounded — the very common "switch to WhatsApp and come back"
  // case — so the 10-minute timer above can't be relied on alone. Refresh
  // immediately whenever the app becomes visible again, so a session that's
  // been away longer than 15 minutes recovers on its own instead of every
  // subsequent request failing with a 401 until the person manually reloads.
  useEffect(() => {
    if (!accessToken) return
    const onVisible = () => {
      if (document.visibilityState === 'visible') silentRefresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [accessToken])

  const login = (token, userData) => {
    setAccessToken(token)
    setUser(userData)
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      setAccessToken(null)
      setUser(null)
      localStorage.removeItem('icamagu_user')
    }
  }

  const updateUser = (updates) => {
    setUser((prev) => {
      if (!prev) return prev
      const next = { ...prev }
      Object.keys(updates).forEach((key) => {
        if (typeof updates[key] === 'object' && updates[key] !== null && !Array.isArray(updates[key])) {
          next[key] = { ...prev[key], ...updates[key] }
        } else {
          next[key] = updates[key]
        }
      })
      localStorage.setItem('icamagu_user', JSON.stringify(next))
      return next
    })
  }

  const isAuthenticated = !!accessToken && !!user

  return (
    <AuthContext.Provider value={{ accessToken, user, login, logout, updateUser, checkingSession, debugInfo, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
