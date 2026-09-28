import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { JugadorCatalogo } from './player-types'

interface PlayerCardProps {
  jugador: JugadorCatalogo
}

function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join('')
}

export function PlayerCard({ jugador }: PlayerCardProps) {
  const navigate = useNavigate()
  const [imagenFallida, setImagenFallida] = useState(false)
  const [escudoFallido, setEscudoFallido] = useState(false)
  const puedeVerEstadisticas = jugador.estadisticasDisponibles === true
  const disponibilidadTexto = jugador.estadisticasDisponibles === true
    ? 'Estadísticas disponibles'
    : jugador.estadisticasDisponibles === false
      ? 'Estadísticas no disponibles'
      : 'Consultar estadísticas'
  const disponibilidadClase = jugador.estadisticasDisponibles === true
    ? 'stats-badge-available'
    : jugador.estadisticasDisponibles === false
      ? 'stats-badge-unavailable'
      : 'stats-badge-pending'

  const contenido = (
    <>
      <div className="player-card-visual" aria-hidden="true">
        <span className="player-card-visual-grid" />
        <span className="player-card-visual-league">{jugador.liga.codigo}</span>
        {jugador.fotoUrl && !imagenFallida ? (
          <img
            className="player-card-player-image"
            src={jugador.fotoUrl}
            onError={() => setImagenFallida(true)}
          />
        ) : (
          <span className="player-card-initials">{iniciales(jugador.nombre) || 'JP'}</span>
        )}
        {jugador.equipo.escudoUrl && !escudoFallido && (
          <span className="player-card-crest-wrap">
            <img
              className="player-card-crest"
              src={jugador.equipo.escudoUrl}
              alt=""
              onError={() => setEscudoFallido(true)}
            />
          </span>
        )}
        <span className="player-card-visual-position">{jugador.posicion ?? 'PLAYER'}</span>
      </div>
      <div className="player-card-body">
        <div className="player-card-topline">
          <span className="player-card-type">PLAYER PROFILE</span>
          <span className={`stats-badge ${disponibilidadClase}`}>
            <span className="stats-badge-dot" aria-hidden="true" />
            {disponibilidadTexto}
          </span>
        </div>
        <div className="player-card-heading">
          <h3>{jugador.nombre}</h3>
        </div>
        <dl className="player-card-data">
          <div>
            <dt>Equipo</dt>
            <dd>{jugador.equipo.nombre}</dd>
          </div>
          <div>
            <dt>Liga</dt>
            <dd>{jugador.liga.nombre}</dd>
          </div>
          {jugador.posicion && (
            <div>
              <dt>Posición</dt>
              <dd>{jugador.posicion}</dd>
            </div>
          )}
          {jugador.nacionalidad && (
            <div>
              <dt>Nacionalidad</dt>
              <dd>{jugador.nacionalidad}</dd>
            </div>
          )}
        </dl>
        <div className="player-card-footer">
          <span>Ver detalles</span>
          <span className="player-card-arrow" aria-hidden="true">→</span>
        </div>
      </div>
    </>
  )

  return (
    <button
      className="player-card player-card-action"
      type="button"
      onClick={() => navigate(`/app/players/${encodeURIComponent(jugador.id)}/estadisticas`)}
      aria-label={puedeVerEstadisticas ? `Ver estadísticas de ${jugador.nombre}` : `Ver ficha de ${jugador.nombre}`}
    >
      {contenido}
    </button>
  )
}
