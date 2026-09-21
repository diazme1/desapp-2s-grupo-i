export interface RegisterFormData {
  correo: string
  password: string
  confirmacionPassword: string
}

export interface LoginFormData {
  correo: string
  password: string
}

export interface PublicUser {
  id: string
  correo: string
  creadoEn: string
}

export interface TokenResponse {
  accessToken: string
  tokenType: 'Bearer'
  expiresIn: number
}

export interface AuthSession {
  accessToken: string
  tokenType: 'Bearer'
  expiresAt: number
  user: PublicUser
}

export type AuthStatus = 'loading' | 'anonymous' | 'authenticating' | 'authenticated'

export type FieldErrors<T extends string> = Partial<Record<T, string>>

export interface ApiErrorResponse {
  statusCode?: number
  message?: string
}
