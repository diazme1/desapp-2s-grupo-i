import type { AuthSession } from './auth-types'

const storageKey = 'football-market.auth-session'

function isSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== 'object') return false
  const session = value as Partial<AuthSession>
  return typeof session.accessToken === 'string'
    && session.tokenType === 'Bearer'
    && typeof session.expiresAt === 'number'
    && Boolean(session.user && typeof session.user.correo === 'string')
}

export function readSession(): AuthSession | null {
  try {
    const raw = window.sessionStorage.getItem(storageKey)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!isSession(parsed) || parsed.expiresAt <= Date.now()) {
      clearSession()
      return null
    }
    return parsed
  } catch {
    clearSession()
    return null
  }
}

export function saveSession(session: AuthSession): void {
  window.sessionStorage.setItem(storageKey, JSON.stringify(session))
}

export function clearSession(): void {
  window.sessionStorage.removeItem(storageKey)
}
