import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/auth-context'
import { BrandMark } from '../auth/auth-icons'
import { useMarket } from './market-context'
import './market.css'

function formatoCreditos(value: string | undefined): string {
  if (!value) return '—'
  const [enteros, decimales] = value.split('.')
  return `${BigInt(enteros).toLocaleString('es-AR')},${decimales ?? '00'}`
}

export function MarketLayout() {
  const { user, logout } = useAuth()
  const { portfolio, portfolioStatus } = useMarket()
  const navigate = useNavigate()

  function cerrarSesion() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="market-shell">
      <header className="market-topbar">
        <NavLink className="market-brand" to="/app" aria-label="Valor 90, inicio">
          <BrandMark className="market-brand-mark" />
          <span className="market-brand-name">Valor <strong>90</strong></span>
        </NavLink>
        <nav className="market-nav" aria-label="Navegación principal">
          <NavLink to="/app" end>Mercado</NavLink>
          <NavLink to="/app/ranking">Ranking</NavLink>
          {user?.rol !== 'superadmin' && <NavLink to="/app/portfolio">Mi cartera</NavLink>}
          {user?.rol === 'superadmin' && <NavLink to="/app#admin-quote-panel">Administración</NavLink>}
        </nav>
        <div className="market-account">
          {user?.rol !== 'superadmin' && (
            <NavLink className="market-balance" to="/app/portfolio" aria-label="Ver saldo y cartera">
              <span>Créditos</span>
              <strong>{portfolioStatus === 'ready' ? `${formatoCreditos(portfolio?.creditosDisponibles)} cr` : '…'}</strong>
            </NavLink>
          )}
          <span className="market-user-email">{user?.correo}</span>
          <button className="market-logout" type="button" onClick={cerrarSesion}>Salir</button>
        </div>
      </header>
      <Outlet />
    </div>
  )
}
