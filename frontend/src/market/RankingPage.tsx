import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/auth-context'
import { ApiError } from '../shared/http-client'
import { listarRanking, type EstrategiaCotizacion, type RankingCotizaciones } from './market-api'

function precio(value: number): string {
  return `${value.toFixed(2).replace('.', ',')} cr`
}

export function RankingPage() {
  const { session } = useAuth()
  const [estrategia, setEstrategia] = useState<EstrategiaCotizacion | ''>('')
  const [ranking, setRanking] = useState<RankingCotizaciones | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    if (!session?.accessToken) return
    setCargando(true)
    setError('')
    try {
      setRanking(await listarRanking(session.accessToken, estrategia || undefined))
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'No se pudo cargar el ranking.')
    } finally {
      setCargando(false)
    }
  }, [session?.accessToken, estrategia])

  useEffect(() => { void cargar() }, [cargar])

  return (
    <main className="market-page">
      <header className="market-page-heading">
        <div>
          <p className="players-eyebrow">MERCADO</p>
          <h1>Ranking de <span>cotizaciones</span></h1>
          <p className="players-intro">Compará el valor vigente de los jugadores según cada estrategia.</p>
        </div>
        <label className="ranking-strategy-select">
          Estrategia
          <select value={estrategia} onChange={(event) => setEstrategia(event.target.value as EstrategiaCotizacion | '')}>
            <option value="">Estrategia activa</option>
            <option value="ataque_decisivo">Ataque decisivo</option>
            <option value="creacion_tecnica">Creación técnica</option>
          </select>
        </label>
      </header>

      {ranking?.fechaHora && <p className="ranking-updated">Actualizado {new Date(ranking.fechaHora).toLocaleString('es-AR')} · {ranking.estrategia === 'ataque_decisivo' ? 'Ataque decisivo' : 'Creación técnica'}</p>}
      {cargando && <div className="players-status" role="status">Cargando ranking…</div>}
      {error && <div className="players-status players-status-error" role="alert"><p>{error}</p><button className="primary-button" type="button" onClick={() => void cargar()}>Reintentar</button></div>}
      {!cargando && !error && ranking?.jugadores.length === 0 && (
        <div className="players-status"><h2>No hay cotizaciones todavía</h2><p>Cuando el superadmin ejecute un recálculo, los valores aparecerán acá.</p></div>
      )}
      {!cargando && !error && ranking && ranking.jugadores.length > 0 && (
        <div className="ranking-table-wrap">
          <table className="ranking-table">
            <thead><tr><th>#</th><th>Jugador</th><th>Equipo</th><th>Liga</th><th>Cotización</th><th>Disponibles</th></tr></thead>
            <tbody>
              {ranking.jugadores.map((jugador, index) => (
                <tr key={jugador.id}>
                  <td className="ranking-position">{index + 1}</td>
                  <td><Link to={`/app/players/${encodeURIComponent(jugador.id)}/estadisticas`}>{jugador.nombre}</Link></td>
                  <td>{jugador.equipo}</td>
                  <td>{jugador.liga}</td>
                  <td className="ranking-price">{precio(jugador.cotizacion)}</td>
                  <td>{jugador.tokensDisponibles}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
