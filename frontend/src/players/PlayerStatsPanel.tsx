import type { EstadisticasJugador } from './player-types'

interface PlayerStatsPanelProps {
  estadisticas: EstadisticasJugador
}

const metricas: Array<{ key: keyof Omit<EstadisticasJugador, 'estado'>; label: string }> = [
  { key: 'goles', label: 'Goles' },
  { key: 'asistencias', label: 'Asistencias' },
  { key: 'tiros', label: 'Tiros' },
  { key: 'pasesClave', label: 'Pases clave' },
  { key: 'regates', label: 'Regates' },
  { key: 'faltasCometidas', label: 'Faltas cometidas' },
  { key: 'ratingWhoScored', label: 'Rating WhoScored' },
]

function estadoVisible(estadisticas: EstadisticasJugador): 'completo' | 'parcial' {
  if (estadisticas.estado === 'completo') return 'completo'
  if (estadisticas.estado === 'parcial') return 'parcial'
  return metricas.every(({ key }) => estadisticas[key] !== null) ? 'completo' : 'parcial'
}

export function PlayerStatsPanel({ estadisticas }: PlayerStatsPanelProps) {
  const estado = estadoVisible(estadisticas)

  return (
    <section className="stats-panel" aria-labelledby="stats-panel-title">
      <div className="stats-panel-heading">
        <div>
          <p className="section-kicker">Rendimiento</p>
          <h2 id="stats-panel-title">Estadísticas del jugador</h2>
        </div>
        <span className={`stats-badge ${estado === 'completo' ? 'stats-badge-available' : 'stats-badge-partial'}`}>
          {estado === 'completo' ? 'Datos completos' : 'Datos parciales'}
        </span>
      </div>
      <dl className="stats-grid">
        {metricas.map(({ key, label }) => {
          const value = estadisticas[key]
          return (
            <div className="stats-metric" key={key}>
              <dt>{label}</dt>
              <dd>{value === null ? 'No disponible' : value}</dd>
            </div>
          )
        })}
      </dl>
    </section>
  )
}
