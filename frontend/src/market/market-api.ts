import { request, withBearer } from '../shared/http-client'

export type EstrategiaCotizacion = 'ataque_decisivo' | 'creacion_tecnica'

export interface JugadorCotizado {
  id: string
  nombre: string
  equipo: string
  liga: string
  cotizacion: number
  tokensDisponibles: number
}

export interface RankingCotizaciones {
  estrategia: EstrategiaCotizacion | null
  idRecalculo: string | null
  fechaHora: string | null
  jugadores: JugadorCotizado[]
}

export interface HistorialCotizacion {
  id: string
  idJugador: string
  fechaHora: string
  cotizacion: number
  tipoEstrategia: string
}

export interface HistorialCotizaciones {
  items: HistorialCotizacion[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface PosicionPortfolio {
  idJugador: string
  jugador: string
  equipo: string
  liga: string
  cantidadTokens: number
  cotizacion: string | null
  fechaCotizacion: string | null
  precioPromedioCompra: string | null
  valorActual: string | null
  gananciaPerdida: string | null
}

export interface OperacionPortfolio {
  idOperacion: string
  tipo: 'compra' | 'venta'
  idJugador: string
  jugador: string
  cantidadTokens: number
  cotizacion: string
  importe: string
  fechaHora: string
}

export interface Portfolio {
  creditosDisponibles: string
  valorTotal: string
  gananciaPerdidaTotal: string
  posiciones: PosicionPortfolio[]
  operacionesRecientes: OperacionPortfolio[]
}

export interface ResultadoOperacion {
  idOperacion: string
  idJugador: string
  idComprador: string
  idVendedor: string
  cantidadTokens: number
  cotizacion: string
  importe: string
  estrategia: EstrategiaCotizacion
  fechaHora: string
}

export interface ResultadoRecalculo {
  idRecalculo: string
  estrategia: EstrategiaCotizacion
  estrategiasCalculadas: EstrategiaCotizacion[]
  versionEstrategia: number
  fechaHora: string
  jugadoresCotizados: number
  jugadoresSinEstadisticas: number
}

export function listarRanking(token: string, estrategia?: EstrategiaCotizacion): Promise<RankingCotizaciones> {
  const query = estrategia ? `?estrategia=${encodeURIComponent(estrategia)}` : ''
  return request<RankingCotizaciones>(`/players/ranking${query}`, withBearer(token))
}

export function listarHistorialCotizaciones(token: string, jugadorId: string): Promise<HistorialCotizaciones> {
  return request<HistorialCotizaciones>(
    `/players/${encodeURIComponent(jugadorId)}/quotes?page=1&limit=100`,
    withBearer(token),
  )
}

export function obtenerPortfolio(token: string): Promise<Portfolio> {
  return request<Portfolio>('/users/me/portfolio', withBearer(token))
}

function crearClaveIdempotencia(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

async function enviarOrden(
  token: string,
  accion: 'buy' | 'sell',
  idJugador: string,
  cantidadTokens: number,
): Promise<ResultadoOperacion> {
  return request<ResultadoOperacion>(`/orders/${accion}`, {
    method: 'POST',
    headers: {
      ...withBearer(token).headers,
      'Idempotency-Key': crearClaveIdempotencia(),
    },
    body: JSON.stringify({ idJugador, cantidadTokens }),
  })
}

export function comprarTokens(token: string, idJugador: string, cantidadTokens: number): Promise<ResultadoOperacion> {
  return enviarOrden(token, 'buy', idJugador, cantidadTokens)
}

export function venderTokens(token: string, idJugador: string, cantidadTokens: number): Promise<ResultadoOperacion> {
  return enviarOrden(token, 'sell', idJugador, cantidadTokens)
}

export function recalcularCotizaciones(
  token: string,
  estrategia: EstrategiaCotizacion,
): Promise<ResultadoRecalculo> {
  return request<ResultadoRecalculo>('/quotes/recalculate', {
    method: 'POST',
    ...withBearer(token),
    body: JSON.stringify({ estrategia }),
  })
}
