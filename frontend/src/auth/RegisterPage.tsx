import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '../shared/http-client'
import { EyeIcon, LockIcon, MailIcon } from './auth-icons'
import { register } from './auth-api'
import { normalizeEmail, validateRegister } from './auth-validation'
import type { FieldErrors, RegisterFormData } from './auth-types'

export function RegisterPage() {
  const navigate = useNavigate()
  const [values, setValues] = useState<RegisterFormData>({
    correo: '',
    password: '',
    confirmacionPassword: '',
  })
  const [errors, setErrors] = useState<FieldErrors<'correo' | 'password' | 'confirmacionPassword'>>({})
  const [serverError, setServerError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)

  function update(field: keyof RegisterFormData, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setServerError('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateRegister(values)
    setErrors(nextErrors)
    setServerError('')
    if (Object.keys(nextErrors).length > 0) return

    setIsSubmitting(true)
    try {
      await register({ ...values, correo: normalizeEmail(values.correo) })
      navigate('/login', { replace: true, state: { registered: true } })
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setServerError('Ya existe una cuenta con ese correo.')
      } else if (error instanceof ApiError && error.status === 0) {
        setServerError('No pudimos conectarnos con el servidor. Intentá nuevamente.')
      } else {
        setServerError('No pudimos crear la cuenta. Revisá los datos e intentá nuevamente.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-card-header">
        <h1>Crear cuenta</h1>
        <p>Registrate y empezá a seguir el valor<br className="desktop-break" /> de tus jugadores favoritos.</p>
      </div>

      {serverError && <div className="feedback feedback-error" role="alert">{serverError}</div>}

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="field-group">
          <label htmlFor="register-correo">Email</label>
          <div className="input-shell">
            <MailIcon className="field-icon" />
            <input
              id="register-correo"
              name="correo"
              type="email"
              autoComplete="email"
              placeholder="tu@email.com"
              value={values.correo}
              onChange={(event) => update('correo', event.target.value)}
              aria-invalid={Boolean(errors.correo)}
              aria-describedby={errors.correo ? 'register-correo-error' : undefined}
            />
          </div>
          {errors.correo && <span id="register-correo-error" className="field-error">{errors.correo}</span>}
        </div>

        <div className="field-group">
          <label htmlFor="register-password">Contraseña</label>
          <div className="input-shell">
            <LockIcon className="field-icon" />
            <input
              id="register-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Tu contraseña"
              value={values.password}
              onChange={(event) => update('password', event.target.value)}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'register-password-error' : undefined}
            />
            <button
              className="password-toggle"
              type="button"
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              onClick={() => setShowPassword((current) => !current)}
            >
              <EyeIcon hidden={showPassword} />
            </button>
          </div>
          <span className="field-help">Usá al menos 8 caracteres.</span>
          {errors.password && <span id="register-password-error" className="field-error">{errors.password}</span>}
        </div>

        <div className="field-group">
          <label htmlFor="register-confirmacion">Confirmar contraseña</label>
          <div className="input-shell">
            <LockIcon className="field-icon" />
            <input
              id="register-confirmacion"
              name="confirmacionPassword"
              type={showConfirmation ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Repetí tu contraseña"
              value={values.confirmacionPassword}
              onChange={(event) => update('confirmacionPassword', event.target.value)}
              aria-invalid={Boolean(errors.confirmacionPassword)}
              aria-describedby={errors.confirmacionPassword ? 'register-confirmacion-error' : undefined}
            />
            <button
              className="password-toggle"
              type="button"
              aria-label={showConfirmation ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              onClick={() => setShowConfirmation((current) => !current)}
            >
              <EyeIcon hidden={showConfirmation} />
            </button>
          </div>
          {errors.confirmacionPassword && <span id="register-confirmacion-error" className="field-error">{errors.confirmacionPassword}</span>}
        </div>

        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creando cuenta…' : 'Crear cuenta'}
        </button>
      </form>

      <div className="auth-divider" />
      <p className="auth-switch">
        ¿Ya tenés una cuenta? <Link to="/login">Iniciar sesión</Link>
      </p>
    </div>
  )
}
