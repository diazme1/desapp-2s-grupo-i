import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../auth/auth-context'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  if (status === 'loading' || status === 'authenticating') {
    return <div className="route-loading" role="status">Verificando tu sesión…</div>
  }
  if (status !== 'authenticated') return <Navigate to="/login" replace />
  return children
}
