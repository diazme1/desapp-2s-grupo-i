import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../shared/http-client'
import { EyeIcon, LockIcon, MailIcon } from './auth-icons'
import { useAuth } from './auth-context'
import { normalizeEmail, validateLogin } from './auth-validation'
import type { FieldErrors, LoginFormData } from './auth-types'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, status } = useAuth()
  const [values, setValues] = useState<LoginFormData>({ correo: '', password: '' })
  const [errors, setErrors] = useState<FieldErrors<'correo' | 'password'>>({})
  const [serverError, setServerError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const successMessage = (location.state as { registered?: boolean } | null)?.registered
    ? 'Tu cuenta fue creada. Ahora podés iniciar sesión.'
    : ''

  function update(field: keyof LoginFormData, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setServerError('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateLogin(values)
    setErrors(nextErrors)
    setServerError('')
    if (Object.keys(nextErrors).length > 0) return

    try {
      await login({ ...values, correo: normalizeEmail(values.correo) })
      navigate('/app', { replace: true })
    } catch (error) {
      setServerError(error instanceof ApiError && error.status === 0
        ? 'No pudimos conectarnos con el servidor. Intentá nuevamente.'
        : 'El correo o la contraseña no son válidos.')
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-card-header">
        <h1>Iniciar sesión</h1>
        <p>Volvé a tu cuenta y seguí gestionando<br className="desktop-break" /> tu portafolio de jugadores.</p>
      </div>

      {successMessage && <div className="feedback feedback-success" role="status">{successMessage}</div>}
      {serverError && <div className="feedback feedback-error" role="alert">{serverError}</div>}

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="field-group">
          <label htmlFor="login-correo">Email</label>
          <div className="input-shell">
            <MailIcon className="field-icon" />
            <input
              id="login-correo"
              name="correo"
              type="email"
              autoComplete="email"
              placeholder="tu@email.com"
              value={values.correo}
              onChange={(event) => update('correo', event.target.value)}
              aria-invalid={Boolean(errors.correo)}
              aria-describedby={errors.correo ? 'login-correo-error' : undefined}
            />
          </div>
          {errors.correo && <span id="login-correo-error" className="field-error">{errors.correo}</span>}
        </div>

        <div className="field-group">
          <label htmlFor="login-password">Contraseña</label>
          <div className="input-shell">
            <LockIcon className="field-icon" />
            <input
              id="login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Tu contraseña"
              value={values.password}
              onChange={(event) => update('password', event.target.value)}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'login-password-error' : undefined}
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
          {errors.password && <span id="login-password-error" className="field-error">{errors.password}</span>}
        </div>

        <div className="forgot-row">
          <a className="forgot-link" href="#forgot-password" onClick={(event) => event.preventDefault()}>¿Olvidaste tu contraseña?</a>
        </div>

        <button className="primary-button" type="submit" disabled={status === 'authenticating'}>
          {status === 'authenticating' ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>

      <div className="auth-divider" />
      <p className="auth-switch">
        ¿No tenés cuenta? <Link to="/register">Crear cuenta</Link>
      </p>
    </div>
  )
}
