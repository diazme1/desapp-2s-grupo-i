import { Link, Outlet } from 'react-router-dom'
import { BrandMark } from './auth-icons'
import './auth.css'

export function AuthLayout() {
  return (
    <main className="auth-page">
      <div className="auth-frame">
        <header className="auth-header">
          <Link className="brand-lockup" to="/login" aria-label="PlayerMarket, ir al inicio de sesión">
            <BrandMark className="brand-logo" />
            <span className="brand-wordmark">
              <strong>PlayerMarket</strong>
              <small>EL VALOR DEL FÚTBOL, EN TUS MANOS</small>
            </span>
          </Link>
          <nav className="auth-nav" aria-label="Navegación principal">
            <a href="#about">Sobre nosotros</a>
            <a href="#help">Ayuda</a>
            <Link className="nav-login" to="/login">Iniciar sesión</Link>
          </nav>
        </header>

        <div className="auth-body">
          <section className="auth-form-pane">
            <Outlet />
          </section>
        </div>

        <footer className="auth-footer">
          <span>© 2024 PlayerMarket. Todos los derechos reservados.</span>
          <div className="footer-links">
            <a href="#privacy">Privacidad</a>
            <a href="#terms">Términos</a>
            <a href="#contact">Contacto</a>
            <span className="social-links" aria-label="Redes sociales">
              <a href="#twitter" aria-label="Twitter">♥</a>
              <a href="#instagram" aria-label="Instagram">◎</a>
              <a href="#linkedin" aria-label="LinkedIn">in</a>
              <a href="#youtube" aria-label="YouTube">▶</a>
            </span>
          </div>
        </footer>
      </div>
    </main>
  )
}
