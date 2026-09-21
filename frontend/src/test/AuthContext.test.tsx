import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AuthProvider, useAuth } from '../auth/auth-context'

function Probe() {
  const { status, user, logout } = useAuth()
  return (
    <div>
      <span>{status}</span>
      <span>{user?.correo}</span>
      <button type="button" onClick={logout}>Salir</button>
    </div>
  )
}

describe('AuthContext', () => {
  it('recupera una sesión válida desde sessionStorage', async () => {
    window.sessionStorage.setItem('football-market.auth-session', JSON.stringify({
      accessToken: 'token',
      tokenType: 'Bearer',
      expiresAt: Date.now() + 60000,
      user: { id: '1', correo: 'viejo@example.com', creadoEn: '2026-09-20T00:00:00.000Z' },
    }))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: '1', correo: 'ana@example.com', creadoEn: '2026-09-20T00:00:00.000Z' }), { status: 200, headers: { 'content-type': 'application/json' } })))

    render(<AuthProvider><Probe /></AuthProvider>)

    expect(await screen.findByText('authenticated')).toBeInTheDocument()
    expect(screen.getByText('ana@example.com')).toBeInTheDocument()
  })

  it('limpia la sesión al cerrar sesión', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn())
    render(<AuthProvider><Probe /></AuthProvider>)

    expect(await screen.findByText('anonymous')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Salir' }))
    expect(screen.getByText('anonymous')).toBeInTheDocument()
    expect(window.sessionStorage.getItem('football-market.auth-session')).toBeNull()
  })

  it('vuelve a estado anónimo cuando /auth/me rechaza la sesión', async () => {
    window.sessionStorage.setItem('football-market.auth-session', JSON.stringify({
      accessToken: 'token',
      tokenType: 'Bearer',
      expiresAt: Date.now() + 60000,
      user: { id: '1', correo: 'ana@example.com', creadoEn: '2026-09-20T00:00:00.000Z' },
    }))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ statusCode: 401 }), { status: 401, headers: { 'content-type': 'application/json' } })))

    render(<AuthProvider><Probe /></AuthProvider>)

    expect(await screen.findByText('anonymous')).toBeInTheDocument()
    expect(window.sessionStorage.getItem('football-market.auth-session')).toBeNull()
  })
})
