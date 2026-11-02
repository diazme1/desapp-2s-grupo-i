import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '../auth/auth-context'
import { ApiError } from '../shared/http-client'
import { obtenerPortfolio, type Portfolio } from './market-api'

interface MarketContextValue {
  portfolio: Portfolio | null
  portfolioStatus: 'loading' | 'ready' | 'error'
  portfolioError: string
  refreshPortfolio: () => Promise<void>
}

const MarketContext = createContext<MarketContextValue | null>(null)

export function MarketProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [portfolioStatus, setPortfolioStatus] = useState<MarketContextValue['portfolioStatus']>('loading')
  const [portfolioError, setPortfolioError] = useState('')

  const refreshPortfolio = useCallback(async () => {
    if (!session?.accessToken) return
    setPortfolioStatus('loading')
    setPortfolioError('')
    try {
      const result = await obtenerPortfolio(session.accessToken)
      setPortfolio(result)
      setPortfolioStatus('ready')
    } catch (error) {
      setPortfolioStatus('error')
      setPortfolioError(error instanceof ApiError ? error.message : 'No se pudo actualizar tu cartera.')
    }
  }, [session?.accessToken])

  useEffect(() => {
    void refreshPortfolio()
  }, [refreshPortfolio])

  const value = useMemo(() => ({ portfolio, portfolioStatus, portfolioError, refreshPortfolio }), [
    portfolio,
    portfolioStatus,
    portfolioError,
    refreshPortfolio,
  ])
  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>
}

export function useMarket(): MarketContextValue {
  const value = useContext(MarketContext)
  if (!value) throw new Error('useMarket debe utilizarse dentro de MarketProvider.')
  return value
}
