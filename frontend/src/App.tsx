import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { useAuth } from './auth/auth-context'
import { AuthLayout } from './auth/AuthLayout'
import { LoginPage } from './auth/LoginPage'
import { RegisterPage } from './auth/RegisterPage'
import { ProtectedRoute } from './app/ProtectedRoute'
import { PlayersPage } from './players/PlayersPage'
import { PlayerStatsPage } from './players/PlayerStatsPage'
import './App.css'

function AuthenticatedHome() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return <PlayersPage onLogout={handleLogout} />
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
      <Route
        path="/app/players/:id/estadisticas"
        element={
          <ProtectedRoute>
            <PlayerStatsPage />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
