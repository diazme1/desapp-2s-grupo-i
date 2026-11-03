import type { PrediccionJugador } from './player-types'

interface PlayerPredictionPanelProps {
  prediccion: PrediccionJugador | null
  error?: string
}

export function PlayerPredictionPanel({ prediccion, error }: PlayerPredictionPanelProps) {
  if (!prediccion) return null
  const noDisponible = !prediccion.prediccionDisponible || prediccion.cotizacionPredicha === null
  return (
    <section className="stats-panel prediction-panel" aria-labelledby="prediction-panel-title">
      <div className="stats-panel-heading">
        <div>
          <p className="section-kicker">Pronóstico a 15 días</p>
          <h2 id="prediction-panel-title">Cotización del jugador</h2>
        </div>
        <span className={`stats-badge ${noDisponible ? 'stats-badge-partial' : 'stats-badge-available'}`}>
          {noDisponible ? 'No disponible' : 'Estimación'}
        </span>
      </div>
      <dl className="prediction-meta">
        <div><dt>Cotización actual</dt><dd>{prediccion.cotizacionActual ? `${Number(prediccion.cotizacionActual).toFixed(2)} cr` : 'Sin cotización'}</dd></div>
        <div><dt>Cotización predicha</dt><dd>{noDisponible ? 'No disponible' : `${Number(prediccion.cotizacionPredicha).toFixed(2)} cr`}</dd></div>
        {prediccion.versionModelo && <div><dt>Modelo</dt><dd>{prediccion.versionModelo}</dd></div>}
        {prediccion.versionEstrategia && <div><dt>Estrategia</dt><dd>{prediccion.versionEstrategia}</dd></div>}
        {prediccion.fechaObjetivo && <div><dt>Fecha objetivo</dt><dd>{prediccion.fechaObjetivo}</dd></div>}
      </dl>
      {(error || prediccion.mensaje) && <p role="status">{error ?? prediccion.mensaje}</p>}
    </section>
  )
}
