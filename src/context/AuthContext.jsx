import { createContext, useContext, useState, useEffect } from 'react'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(null)
  const [user, setUser] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [debugInfo, setDebugInfo] = useState('')

  const silentRefresh = () => {
    return fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) throw new Error('Session expired')
        const data = await res.json()
        if (!data.accessToken) throw new Error('Invalid session data')
        setAccessToken(data.accessToken)
        setUser(data.user)
        return true
      })
      .catch((err) => {
        setDebugInfo(err.message)
        setAccessToken(null)
        setUser(null)
        return false
      })
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
