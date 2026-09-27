import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getCurrentUser, login, register } from '../auth/auth-api'
import { ApiError, setUnauthorizedHandler } from '../shared/http-client'

describe('auth-api', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    setUnauthorizedHandler(undefined)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('envía el registro normalizado y devuelve el usuario público', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ id: '1', correo: 'ana@example.com', creadoEn: '2026-09-20T00:00:00.000Z' }), { status: 201, headers: { 'content-type': 'application/json' } }))

    await register({ correo: ' ANA@EXAMPLE.COM ', password: 'secreto123', confirmacionPassword: 'secreto123' })

    expect(fetch).toHaveBeenCalledWith('/api/auth/register', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ correo: 'ana@example.com', password: 'secreto123' }),
    }))
  })

  it('convierte el conflicto de registro en ApiError', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ statusCode: 409, message: 'El recurso ya existe.' }), { status: 409, headers: { 'content-type': 'application/json' } }))

    await expect(register({ correo: 'ana@example.com', password: 'secreto123', confirmacionPassword: 'secreto123' }))
      .rejects.toMatchObject({ status: 409 })
  })

  it('login y me utilizan el contrato Bearer', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify({ accessToken: 'token', tokenType: 'Bearer', expiresIn: 900 }), { status: 200, headers: { 'content-type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: '1', correo: 'ana@example.com', creadoEn: '2026-09-20T00:00:00.000Z' }), { status: 200, headers: { 'content-type': 'application/json' } }))

    await login({ correo: 'ana@example.com', password: 'secreto123' })
    await getCurrentUser('token')

    const lastCall = vi.mocked(fetch).mock.calls.at(-1)
    expect(lastCall?.[0]).toBe('/api/auth/me')
    expect(new Headers(lastCall?.[1]?.headers).get('Authorization')).toBe('Bearer token')
  })

  it('notifica una respuesta 401 y conserva el status del error', async () => {
    const onUnauthorized = vi.fn()
    setUnauthorizedHandler(onUnauthorized)
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ message: 'No autorizado' }), { status: 401, headers: { 'content-type': 'application/json' } }))

    await expect(getCurrentUser('bad-token')).rejects.toBeInstanceOf(ApiError)
    expect(onUnauthorized).toHaveBeenCalledOnce()
  })
})
