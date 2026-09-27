import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { useAuth } from './auth/auth-context'
import { AuthLayout } from './auth/AuthLayout'
import { LoginPage } from './auth/LoginPage'
import { RegisterPage } from './auth/RegisterPage'
import { ProtectedRoute } from './app/ProtectedRoute'
import './App.css'

function AuthenticatedHome() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <main className="app-home">
      <header className="app-header">
        <div>
          <p className="eyebrow">PlayerMarket</p>
          <h1>Tu cuenta está lista</h1>
        </div>
        <button className="text-button" type="button" onClick={handleLogout}>Cerrar sesión</button>
      </header>
      <section className="welcome-card">
        <span className="status-dot" aria-hidden="true" />
        <div>
          <h2>Sesión autenticada</h2>
          <p>Ingresaste como <strong>{user?.correo}</strong>. El mercado de jugadores estará disponible en la próxima feature.</p>
        </div>
      </section>
    </main>
  )
}

function App() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AuthenticatedHome />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
