import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getCurrentUser, login as loginRequest } from './auth-api'
import { clearSession, readSession, saveSession } from './auth-storage'
import type { AuthSession, AuthStatus, LoginFormData, PublicUser } from './auth-types'
import { setUnauthorizedHandler } from '../shared/http-client'

interface AuthContextValue {
  session: AuthSession | null
  status: AuthStatus
  user: PublicUser | null
  login: (values: LoginFormData) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

  const invalidateSession = useCallback(() => {
    clearSession()
    setSession(null)
    setStatus('anonymous')
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(invalidateSession)
    const stored = readSession()
    if (!stored) {
      setStatus('anonymous')
      return () => setUnauthorizedHandler(undefined)
    }

    void getCurrentUser(stored.accessToken)
      .then((user) => {
        const updated = { ...stored, user }
        saveSession(updated)
        setSession(updated)
        setStatus('authenticated')
      })
      .catch(() => invalidateSession())

    return () => setUnauthorizedHandler(undefined)
  }, [invalidateSession])

  const login = useCallback(async (values: LoginFormData) => {
    setStatus('authenticating')
    try {
      const token = await loginRequest(values)
      const user = await getCurrentUser(token.accessToken)
      const nextSession: AuthSession = {
        accessToken: token.accessToken,
        tokenType: token.tokenType,
        expiresAt: Date.now() + token.expiresIn * 1000,
        user,
      }
      saveSession(nextSession)
      setSession(nextSession)
      setStatus('authenticated')
    } catch (error) {
      invalidateSession()
      throw error
    }
  }, [invalidateSession])

  const logout = useCallback(() => {
    invalidateSession()
  }, [invalidateSession])

  const value = useMemo<AuthContextValue>(() => ({
    session,
    status,
    user: session?.user ?? null,
    login,
    logout,
  }), [login, logout, session, status])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe utilizarse dentro de AuthProvider.')
  return context
}
