import { normalizeEmail } from './auth-validation'
import type { LoginFormData, PublicUser, RegisterFormData, TokenResponse } from './auth-types'
import { request, withBearer } from '../shared/http-client'

export function register(values: RegisterFormData): Promise<PublicUser> {
  return request<PublicUser>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ correo: normalizeEmail(values.correo), password: values.password }),
  })
}

export function login(values: LoginFormData): Promise<TokenResponse> {
  return request<TokenResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ correo: normalizeEmail(values.correo), password: values.password }),
  })
}

export function getCurrentUser(token: string): Promise<PublicUser> {
  return request<PublicUser>('/auth/me', withBearer(token))
}
