import type { FieldErrors, LoginFormData, RegisterFormData } from './auth-types'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

export function validateLogin(values: LoginFormData): FieldErrors<'correo' | 'password'> {
  const errors: FieldErrors<'correo' | 'password'> = {}
  const correo = normalizeEmail(values.correo)
  if (!correo) errors.correo = 'Ingresá tu correo electrónico.'
  else if (!emailPattern.test(correo)) errors.correo = 'Ingresá un correo electrónico válido.'
  if (!values.password) errors.password = 'Ingresá tu contraseña.'
  else if (values.password.length < 8) errors.password = 'La contraseña debe tener al menos 8 caracteres.'
  return errors
}

export function validateRegister(
  values: RegisterFormData,
): FieldErrors<'correo' | 'password' | 'confirmacionPassword'> {
  const errors: FieldErrors<'correo' | 'password' | 'confirmacionPassword'> = {}
  const correo = normalizeEmail(values.correo)
  if (!correo) errors.correo = 'Ingresá tu correo electrónico.'
  else if (!emailPattern.test(correo)) errors.correo = 'Ingresá un correo electrónico válido.'
  if (!values.password) errors.password = 'Elegí una contraseña.'
  else if (values.password.length < 8) errors.password = 'La contraseña debe tener al menos 8 caracteres.'
  if (!values.confirmacionPassword) errors.confirmacionPassword = 'Confirmá tu contraseña.'
  else if (values.password !== values.confirmacionPassword) errors.confirmacionPassword = 'Las contraseñas no coinciden.'
  return errors
}
