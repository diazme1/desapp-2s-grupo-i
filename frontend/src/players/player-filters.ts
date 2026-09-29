import type {
  DisponibilidadEstadisticas,
  FiltrosCatalogo,
  JugadorCatalogo,
  OpcionFiltro,
} from './player-types'

function normalizarTexto(value: string): string {
  return value.trim().toLocaleLowerCase()
}

export function tieneEstadisticas(jugador: JugadorCatalogo): boolean {
  return jugador.estadisticasDisponibles === true
}

export function filtrarJugadores(jugadores: JugadorCatalogo[], filtros: FiltrosCatalogo): JugadorCatalogo[] {
  const nombre = normalizarTexto(filtros.nombre)

  return jugadores.filter((jugador) => {
    const coincideNombre = !nombre || normalizarTexto(jugador.nombre).includes(nombre)
    const coincideLiga = !filtros.ligaCodigo || jugador.liga.codigo === filtros.ligaCodigo
    const coincideEquipo = !filtros.equipoId || jugador.equipo.id === filtros.equipoId
    const coincideDisponibilidad = filtros.disponibilidadEstadisticas === 'todas'
      || (filtros.disponibilidadEstadisticas === 'disponibles' && tieneEstadisticas(jugador))
      || (filtros.disponibilidadEstadisticas === 'no_disponibles' && !tieneEstadisticas(jugador))

    return coincideNombre && coincideLiga && coincideEquipo && coincideDisponibilidad
  })
}

function opcionesUnicas(values: Array<{ value: string; label: string }>): OpcionFiltro[] {
  const unique = new Map(values.map((option) => [option.value, option]))
  return [...unique.values()].sort((a, b) => a.label.localeCompare(b.label, 'es'))
}

export function obtenerOpcionesLiga(jugadores: JugadorCatalogo[]): OpcionFiltro[] {
  return opcionesUnicas(jugadores.map((jugador) => ({ value: jugador.liga.codigo, label: jugador.liga.nombre })))
}

export function obtenerOpcionesEquipo(jugadores: JugadorCatalogo[], ligaCodigo?: string): OpcionFiltro[] {
  const candidatos = ligaCodigo ? jugadores.filter((jugador) => jugador.liga.codigo === ligaCodigo) : jugadores
  return opcionesUnicas(candidatos.map((jugador) => ({ value: jugador.equipo.id, label: jugador.equipo.nombre })))
}

export function actualizarDisponibilidad(
  disponibilidadEstadisticas: DisponibilidadEstadisticas,
): DisponibilidadEstadisticas {
  return disponibilidadEstadisticas
}
