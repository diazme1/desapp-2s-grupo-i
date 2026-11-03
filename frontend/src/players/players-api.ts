import { ApiError, request, withBearer } from '../shared/http-client'
import type {
  EquipoJugador,
  EstadisticasEstado,
  EstadisticasJugador,
  JugadorCatalogo,
  LigaJugador,
  PrediccionJugador,
} from './player-types'

const estadisticasCampos: Array<keyof Omit<EstadisticasJugador, 'estado'>> = [
  'goles',
  'asistencias',
  'tiros',
  'pasesClave',
  'regates',
  'faltasCometidas',
  'ratingWhoScored',
]

type Registro = Record<string, unknown>

function esRegistro(value: unknown): value is Registro {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function texto(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function requerido(value: unknown, field: string): string {
  const normalized = texto(value)
  if (!normalized) throw new ApiError(0, `El catálogo devolvió un jugador sin ${field}.`)
  return normalized
}

function numero(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function normalizarLiga(value: unknown): LigaJugador {
  if (!esRegistro(value)) throw new ApiError(0, 'El catálogo devolvió un jugador sin liga.')

  return {
    id: requerido(value.id, 'liga válida'),
    codigo: requerido(value.codigo, 'código de liga'),
    nombre: requerido(value.nombre, 'nombre de liga'),
    pais: texto(value.pais),
    emblemaUrl: texto(value.emblemaUrl),
  }
}

function normalizarEquipo(value: unknown): EquipoJugador {
  if (!esRegistro(value)) throw new ApiError(0, 'El catálogo devolvió un jugador sin equipo.')

  return {
    id: requerido(value.id, 'equipo válido'),
    nombre: requerido(value.nombre, 'nombre de equipo'),
    nombreCorto: texto(value.nombreCorto),
    sigla: texto(value.sigla),
    escudoUrl: texto(value.escudoUrl),
  }
}

function normalizarEstadisticas(value: unknown): EstadisticasJugador[] {
  const entradas = Array.isArray(value) ? value : esRegistro(value) ? [value] : []

  return entradas.flatMap((entrada) => {
    if (!esRegistro(entrada)) return []

    const estadisticas: EstadisticasJugador = {
      id: texto(entrada.id) ?? undefined,
      estado: entrada.estado === 'completo' || entrada.estado === 'parcial' || entrada.estado === 'sin_estadisticas'
        ? entrada.estado as EstadisticasEstado
        : undefined,
      goles: numero(entrada.goles),
      asistencias: numero(entrada.asistencias),
      tiros: numero(entrada.tiros),
      pasesClave: numero(entrada.pasesClave),
      regates: numero(entrada.regates),
      faltasCometidas: numero(entrada.faltasCometidas),
      ratingWhoScored: numero(entrada.ratingWhoScored),
    }

    return estadisticasCampos.some((field) => estadisticas[field] !== null) ? [estadisticas] : []
  })
}

function normalizarJugador(value: unknown): JugadorCatalogo {
  if (!esRegistro(value)) throw new ApiError(0, 'El catálogo devolvió un registro inválido.')

  const estadisticas = normalizarEstadisticas(value.estadisticas)
  const disponibilidadDeclarada = typeof value.estadisticasDisponibles === 'boolean'
    ? value.estadisticasDisponibles
    : undefined

  return {
    id: requerido(value.id, 'identificador'),
    nombre: requerido(value.nombre, 'nombre'),
    nombreCompleto: texto(value.nombreCompleto),
    posicion: texto(value.posicion),
    fechaNacimiento: texto(value.fechaNacimiento),
    nacionalidad: texto(value.nacionalidad),
    fotoUrl: texto(value.fotoUrl),
    equipo: normalizarEquipo(value.equipo),
    liga: normalizarLiga(value.liga),
    estadisticasDisponibles: disponibilidadDeclarada ?? (estadisticas.length > 0 ? true : null),
    estadisticas,
  }
}

export async function listarJugadores(token: string): Promise<JugadorCatalogo[]> {
  const payload = await request<unknown>('/players', withBearer(token))
  if (!Array.isArray(payload)) throw new ApiError(0, 'El catálogo devolvió una respuesta inválida.')
  return payload.map(normalizarJugador)
}

export async function obtenerJugador(token: string, id: string): Promise<JugadorCatalogo> {
  const payload = await request<unknown>(`/players/${encodeURIComponent(id)}`, withBearer(token))
  return normalizarJugador(payload)
}

export async function obtenerPrediccion(token: string, id: string): Promise<PrediccionJugador> {
  const payload = await request<unknown>(`/players/${encodeURIComponent(id)}/prediction`, withBearer(token))
  if (!esRegistro(payload) || (payload.estado !== 'disponible' && payload.estado !== 'no_disponible')) {
    throw new ApiError(0, 'La predicción devolvió una respuesta inválida.')
  }
  const estadisticas = esRegistro(payload.estadisticasPredichas)
    ? Object.fromEntries(Object.entries(payload.estadisticasPredichas).map(([key, value]) => [key, String(value)]))
    : {}
  return {
    estado: payload.estado as 'disponible' | 'no_disponible',
    cotizacionActual: payload.cotizacionActual === null || payload.cotizacionActual === undefined ? null : String(payload.cotizacionActual),
    cotizacionPredicha: payload.cotizacionPredicha === null || payload.cotizacionPredicha === undefined ? null : String(payload.cotizacionPredicha),
    prediccionDisponible: payload.prediccionDisponible === true,
    fechaGeneracion: texto(payload.fechaGeneracion) ?? new Date().toISOString(),
    fechaObjetivo: texto(payload.fechaObjetivo) ?? '',
    versionModelo: texto(payload.versionModelo),
    versionEstrategia: texto(payload.versionEstrategia),
    origenDatos: Array.isArray(payload.origenDatos) ? payload.origenDatos.map(String) : [],
    estadisticasPredichas: Object.keys(estadisticas).length > 0 ? estadisticas : null,
    mensaje: texto(payload.mensaje) ?? undefined,
  }
}
