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
      <div className="player-card-photo" aria-hidden={Boolean(jugador.fotoUrl && !imagenFallida)}>
        {jugador.fotoUrl && !imagenFallida ? (
          <img
            src={jugador.fotoUrl}
            alt={`Foto de ${jugador.nombre}`}
            onError={() => setImagenFallida(true)}
          />
        ) : (
          <span>{iniciales(jugador.nombre) || 'JP'}</span>
        )}
      </div>
      <div className="player-card-body">
        <div className="player-card-heading">
          <h3>{jugador.nombre}</h3>
          <span className={`stats-badge ${disponibilidadClase}`}>
            {disponibilidadTexto}
          </span>
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
        </dl>
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
