import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/auth-context'
import { ApiError } from '../shared/http-client'
import { obtenerJugador } from './players-api'
import { PlayerStatsPanel } from './PlayerStatsPanel'
import type { EstadoDetalle, JugadorCatalogo } from './player-types'
import './players.css'

export function PlayerStatsPage() {
  const { session } = useAuth()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [estado, setEstado] = useState<EstadoDetalle>('cargando')
  const [jugador, setJugador] = useState<JugadorCatalogo | null>(null)
  const [mensajeError, setMensajeError] = useState('')

  useEffect(() => {
    let activo = true

    async function cargarDetalle() {
      if (!session?.accessToken || !id) {
        if (activo) {
          setEstado('error_recuperable')
          setMensajeError('No se pudo identificar al jugador solicitado.')
        }
        return
      }

      setEstado('cargando')
      setMensajeError('')
      try {
        const resultado = await obtenerJugador(session.accessToken, id)
        if (!activo) return
        setJugador(resultado)
        setEstado(resultado.estadisticas.length > 0 ? 'con_estadisticas' : 'sin_estadisticas')
      } catch (error) {
        if (!activo) return
        setEstado('error_recuperable')
        setMensajeError(error instanceof ApiError ? error.message : 'No se pudieron consultar las estadísticas.')
      }
    }

    void cargarDetalle()
    return () => {
      activo = false
    }
  }, [id, session?.accessToken])

  return (
    <main className="players-page stats-page">
      <header className="players-header stats-header">
        <div>
          <p className="eyebrow">PlayerMarket</p>
          <h1>Detalle del jugador</h1>
          <p className="players-intro">Consultá el rendimiento disponible para este jugador.</p>
        </div>
        <button className="text-button" type="button" onClick={() => navigate('/app')}>Volver al catálogo</button>
      </header>

      {estado === 'cargando' && <div className="players-status" role="status">Consultando estadísticas…</div>}
      {estado === 'error_recuperable' && (
        <div className="players-status players-status-error" role="alert">
          <h2>No pudimos consultar las estadísticas</h2>
          <p>{mensajeError || 'Las estadísticas no están disponibles en este momento.'}</p>
          <button className="secondary-button" type="button" onClick={() => navigate('/app')}>Volver al catálogo</button>
        </div>
      )}
      {(estado === 'con_estadisticas' || estado === 'sin_estadisticas') && jugador && (
        <section className="stats-layout">
          <article className="stats-player-summary">
            <div className="stats-player-avatar" aria-hidden="true">
              {jugador.fotoUrl ? <img src={jugador.fotoUrl} alt="" /> : jugador.nombre.slice(0, 2).toUpperCase()}
            </div>
            <p className="section-kicker">Jugador</p>
            <h2>{jugador.nombre}</h2>
            <p>{jugador.equipo.nombre} · {jugador.liga.nombre}</p>
            {jugador.posicion && <span>{jugador.posicion}</span>}
          </article>
          {estado === 'con_estadisticas' && jugador.estadisticas.length > 0 ? (
            <PlayerStatsPanel estadisticas={jugador.estadisticas[jugador.estadisticas.length - 1]} />
          ) : (
            <section className="stats-panel stats-panel-empty" aria-live="polite">
              <p className="section-kicker">Rendimiento</p>
              <h2>Estadísticas no disponibles</h2>
              <p>El backend todavía no entregó estadísticas para este jugador.</p>
            </section>
          )}
        </section>
      )}
    </main>
  )
}
