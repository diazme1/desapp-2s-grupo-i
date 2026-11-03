import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/auth-context'
import { ApiError } from '../shared/http-client'
import { obtenerJugador, obtenerPrediccion } from './players-api'
import { PlayerPredictionPanel } from './PlayerPredictionPanel'
import { PlayerStatsPanel } from './PlayerStatsPanel'
import type { EstadoDetalle, JugadorCatalogo, PrediccionJugador } from './player-types'
import { listarHistorialCotizaciones, listarRanking, type EstrategiaCotizacion, type HistorialCotizacion } from '../market/market-api'
import { QuoteHistoryPanel } from '../market/QuoteHistoryPanel'
import { TradeDialog } from '../market/TradeDialog'
import './players.css'

export function PlayerStatsPage() {
  const { session } = useAuth()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [estado, setEstado] = useState<EstadoDetalle>('cargando')
  const [jugador, setJugador] = useState<JugadorCatalogo | null>(null)
  const [mensajeError, setMensajeError] = useState('')
  const [historial, setHistorial] = useState<HistorialCotizacion[]>([])
  const [estrategiaActiva, setEstrategiaActiva] = useState<EstrategiaCotizacion | null>(null)
  const [cotizacion, setCotizacion] = useState<string | null>(null)
  const [tokensDisponibles, setTokensDisponibles] = useState(0)
  const [errorCotizacion, setErrorCotizacion] = useState('')
  const [comprando, setComprando] = useState(false)
  const [prediccion, setPrediccion] = useState<PrediccionJugador | null>(null)
  const [errorPrediccion, setErrorPrediccion] = useState('')
  const [consultandoPrediccion, setConsultandoPrediccion] = useState(false)

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
      setPrediccion(null)
      setErrorPrediccion('')
      setConsultandoPrediccion(false)
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

  async function consultarPrediccion() {
    if (!session?.accessToken || !id || consultandoPrediccion || jugador?.estadisticas.length === 0) return
    setConsultandoPrediccion(true)
    setErrorPrediccion('')
    try {
      const resultado = await obtenerPrediccion(session.accessToken, id)
      setPrediccion(resultado)
    } catch (error) {
      setPrediccion(null)
      setErrorPrediccion(error instanceof ApiError && error.status === 503
        ? 'El servicio de predicción no está disponible.'
        : 'No se pudo consultar la posible cotización.')
    } finally {
      setConsultandoPrediccion(false)
    }
  }

  useEffect(() => {
    let activo = true
    if (!session?.accessToken || !id) return
    void Promise.all([
      listarHistorialCotizaciones(session.accessToken, id),
      listarRanking(session.accessToken),
    ]).then(([quotes, ranking]) => {
      if (!activo) return
      setHistorial(quotes.items)
      setEstrategiaActiva(ranking.estrategia)
      const precio = ranking.jugadores.find((item) => item.id === id)?.cotizacion
      const mercado = ranking.jugadores.find((item) => item.id === id)
      setCotizacion(typeof precio === 'number' && Number.isFinite(precio) ? precio.toFixed(2) : null)
      setTokensDisponibles(mercado?.tokensDisponibles ?? 0)
      setErrorCotizacion('')
    }).catch((error) => {
      if (!activo) return
      setErrorCotizacion(error instanceof ApiError ? error.message : 'No se pudo cargar el historial de cotizaciones.')
    })
    return () => { activo = false }
  }, [id, session?.accessToken])

  return (
    <main className="players-page stats-page">
      <header className="players-header stats-header">
        <div>
          <p className="eyebrow">Valor 90</p>
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
            <div className="detail-quote">
              <span>Cotización vigente</span>
              <strong>{cotizacion ? `${Number(cotizacion).toFixed(2).replace('.', ',')} cr` : 'Sin cotización'}</strong>
              <button
                className="ai-prediction-button"
                type="button"
                disabled={consultandoPrediccion || jugador.estadisticas.length === 0}
                onClick={() => void consultarPrediccion()}
                aria-controls="detail-prediction"
              >
                <span aria-hidden="true">✦</span>
                {consultandoPrediccion ? 'Consultando…' : 'Consultar posible cotización a 15 días'}
              </button>
              {errorPrediccion && <small className="prediction-request-error" role="alert">{errorPrediccion}</small>}
              <PlayerPredictionPanel prediccion={prediccion} error={errorPrediccion} />
            </div>
            <button className="primary-button detail-buy-button" type="button" disabled={!cotizacion || tokensDisponibles === 0} onClick={() => setComprando(true)}>
              Comprar tokens
            </button>
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
      {(estado === 'con_estadisticas' || estado === 'sin_estadisticas') && jugador && (
        <section className="detail-market-sections">
          {errorCotizacion && <p className="market-inline-error" role="status">{errorCotizacion}</p>}
          <QuoteHistoryPanel items={historial} estrategiaActiva={estrategiaActiva} />
        </section>
      )}
      {comprando && jugador && cotizacion && (
        <TradeDialog
          jugadorId={jugador.id}
          nombreJugador={jugador.nombre}
          cotizacion={cotizacion}
          cantidadMaxima={tokensDisponibles}
          lado="compra"
          onClose={() => setComprando(false)}
        />
      )}
    </main>
  )
}
