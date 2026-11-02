import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthLayout } from './auth/AuthLayout'
import { LoginPage } from './auth/LoginPage'
import { RegisterPage } from './auth/RegisterPage'
import { ProtectedRoute } from './app/ProtectedRoute'
import { PlayersPage } from './players/PlayersPage'
import { PlayerStatsPage } from './players/PlayerStatsPage'
import { MarketProvider } from './market/market-context'
import { MarketLayout } from './market/MarketLayout'
import { RankingPage } from './market/RankingPage'
import { PortfolioPage } from './market/PortfolioPage'
import './App.css'

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
            <MarketProvider>
              <MarketLayout />
            </MarketProvider>
          </ProtectedRoute>
        }
      >
        <Route index element={<PlayersPage />} />
        <Route path="players/:id/estadisticas" element={<PlayerStatsPage />} />
        <Route path="ranking" element={<RankingPage />} />
        <Route path="portfolio" element={<PortfolioPage />} />
      </Route>
      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
