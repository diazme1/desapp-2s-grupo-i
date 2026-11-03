import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/auth-context'
import { ApiError } from '../shared/http-client'
import { AdminQuotePanel } from './AdminQuotePanel'
import { listarRanking, type RankingCotizaciones } from './market-api'

export function AdminQuotesPage() {
  const { session } = useAuth()
  const [ranking, setRanking] = useState<RankingCotizaciones | null>(null)
  const [error, setError] = useState('')

  const cargarCotizaciones = useCallback(async () => {
    if (!session?.accessToken) return
    setError('')
    try {
      setRanking(await listarRanking(session.accessToken))
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'No se pudieron cargar las cotizaciones.')
    }
  }, [session?.accessToken])

  useEffect(() => {
    void cargarCotizaciones()
  }, [cargarCotizaciones])

  return (
    <main className="market-page">
      {error && (
        <div className="quote-load-message" role="status">
          <span>No se pudieron cargar las cotizaciones. {error}</span>
          <button type="button" onClick={() => void cargarCotizaciones()}>Reintentar</button>
        </div>
      )}
      <AdminQuotePanel
        estrategiaActiva={ranking?.estrategia ?? null}
        fechaActualizacion={ranking?.fechaHora ?? null}
        onComplete={cargarCotizaciones}
      />
    </main>
  )
}
