import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../auth/auth-context'
import { LoginPage } from '../auth/LoginPage'
import { RegisterPage } from '../auth/RegisterPage'

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/app" element={<p>Área protegida</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  it('valida el formulario sin realizar un request incompleto', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    renderLogin()

    await user.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByText('Ingresá tu correo electrónico.')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('ingresa con credenciales válidas y navega al área protegida', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ accessToken: 'token', tokenType: 'Bearer', expiresIn: 900 }), { status: 200, headers: { 'content-type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: '1', correo: 'ana@example.com', creadoEn: '2026-09-20T00:00:00.000Z' }), { status: 200, headers: { 'content-type': 'application/json' } })))
    renderLogin()

    await user.type(screen.getByLabelText('Email'), 'ana@example.com')
    await user.type(screen.getByLabelText('Contraseña'), 'secreto123')
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByText('Área protegida')).toBeInTheDocument()
  })

  it('muestra un error genérico cuando el backend rechaza las credenciales', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ statusCode: 401, message: 'Credenciales inválidas.' }), { status: 401, headers: { 'content-type': 'application/json' } })))
    renderLogin()

    await user.type(screen.getByLabelText('Email'), 'ana@example.com')
    await user.type(screen.getByLabelText('Contraseña'), 'secreto123')
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByText('El correo o la contraseña no son válidos.')).toBeInTheDocument()
    expect(screen.queryByText('Área protegida')).not.toBeInTheDocument()
  })
})
