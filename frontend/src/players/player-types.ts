export type EstadisticasEstado = 'completo' | 'parcial' | 'sin_estadisticas'

export type DisponibilidadEstadisticas = 'todas' | 'disponibles' | 'no_disponibles'

export interface LigaJugador {
  id: string
  codigo: string
  nombre: string
  pais: string | null
  emblemaUrl: string | null
}

export interface EquipoJugador {
  id: string
  nombre: string
  nombreCorto: string | null
  sigla: string | null
  escudoUrl: string | null
}

export interface EstadisticasJugador {
  id?: string
  estado?: EstadisticasEstado
  goles: number | null
  asistencias: number | null
  tiros: number | null
  pasesClave: number | null
  regates: number | null
  faltasCometidas: number | null
  ratingWhoScored: number | null
}

export interface JugadorCatalogo {
  id: string
  nombre: string
  nombreCompleto: string | null
  posicion: string | null
  fechaNacimiento: string | null
  nacionalidad: string | null
  fotoUrl: string | null
  equipo: EquipoJugador
  liga: LigaJugador
  estadisticasDisponibles: boolean | null
  estadisticas: EstadisticasJugador[]
}

export interface FiltrosCatalogo {
  nombre: string
  ligaCodigo: string
  equipoId: string
  disponibilidadEstadisticas: DisponibilidadEstadisticas
}

export interface OpcionFiltro {
  value: string
  label: string
}

export type EstadoCatalogo = 'cargando' | 'cargado' | 'error'
export type EstadoResultadoCatalogo = 'con_resultados' | 'sin_resultados' | 'catalogo_vacio'
export type EstadoDetalle = 'cargando' | 'con_estadisticas' | 'sin_estadisticas' | 'error_recuperable'

export const filtrosCatalogoIniciales: FiltrosCatalogo = {
  nombre: '',
  ligaCodigo: '',
  equipoId: '',
  disponibilidadEstadisticas: 'todas',
}
