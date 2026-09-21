import type { ApiErrorResponse } from '../auth/auth-types'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api'
let unauthorizedHandler: (() => void) | undefined

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function setUnauthorizedHandler(handler: (() => void) | undefined): void {
  unauthorizedHandler = handler
}

function defaultMessage(status: number): string {
  if (status === 401) return 'Autenticación requerida o credenciales inválidas.'
  if (status === 403) return 'No tenés permiso para acceder a este recurso.'
  if (status === 409) return 'El recurso ya existe.'
  if (status === 422) return 'Los datos enviados no son válidos.'
  return 'No se pudo completar la solicitud.'
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  let response: Response
  try {
    response = await fetch(`${apiBaseUrl}${path}`, { ...options, headers })
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor.')
  }

  let payload: ApiErrorResponse | T | undefined
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    payload = (await response.json()) as ApiErrorResponse | T
  }

  if (!response.ok) {
    if (response.status === 401) unauthorizedHandler?.()
    const errorPayload = payload as ApiErrorResponse | undefined
    const message = typeof errorPayload?.message === 'string'
      ? errorPayload.message
      : defaultMessage(response.status)
    throw new ApiError(response.status, message)
  }

  return payload as T
}

export function withBearer(token: string): RequestInit {
  return { headers: { Authorization: `Bearer ${token}` } }
}
