import type { PrediccionJugador } from './player-types'

interface PlayerPredictionPanelProps {
  prediccion: PrediccionJugador | null
  error?: string
}

export function PlayerPredictionPanel({ prediccion, error }: PlayerPredictionPanelProps) {
  if (!prediccion) return null
  const noDisponible = !prediccion.prediccionDisponible || prediccion.cotizacionPredicha === null
  const fecha = prediccion.fechaObjetivo ? ` (${prediccion.fechaObjetivo})` : ''
  return (
    <div id="detail-prediction" className="detail-prediction" aria-live="polite">
      <span className="detail-prediction-label">Posible cotización</span>
      <strong className={`detail-prediction-value ${noDisponible ? 'detail-prediction-unavailable' : ''}`}>
        {noDisponible ? 'No disponible' : `${Number(prediccion.cotizacionPredicha).toFixed(2).replace('.', ',')} cr`}
      </strong>
      <small className="detail-prediction-note">Estimación a 15 días{fecha}</small>
      {(error || prediccion.mensaje) && <small className="detail-prediction-error" role="status">{error ?? prediccion.mensaje}</small>}
    </div>
  )
}
