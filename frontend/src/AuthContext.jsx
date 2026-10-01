import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import { apiFetch, clearToken, getToken, setToken, setUnauthorizedHandler } from './api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // True while we check whether a saved token is still valid
  const [loading, setLoading] = useState(Boolean(getToken()))

  const logout = useCallback(() => {
    clearToken()
    setUser(null)
  }, [])

  // If any request gets a 401 for our token, log out
  useEffect(() => {
    setUnauthorizedHandler(logout)
  }, [logout])

  // On first load, restore the session from a saved token
  useEffect(() => {
    if (!getToken()) return
    apiFetch('/auth/me')
      .then(setUser)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email, password) => {
    const { access_token } = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    })
    setToken(access_token)
    try {
      setUser(await apiFetch('/auth/me'))
    } catch (error) {
      clearToken()
      throw error
    }
  }, [])

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}