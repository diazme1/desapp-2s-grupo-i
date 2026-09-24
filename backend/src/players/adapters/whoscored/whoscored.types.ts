export type WhoScoredEstado =
  | 'exito_completo'
  | 'exito_parcial'
  | 'jugador_no_encontrado'
  | 'matching_ambiguo'
  | 'fuente_no_disponible'
  | 'estructura_inesperada'
  | 'sin_estadisticas';

export interface WhoScoredLookupInput {
  nombreJugador: string;
  equipoJugador: string;
  ligaEquipoJugador: string;
}

export interface WhoScoredMetricas {
  goles: number | null;
  asistencias: number | null;
  tiros: number | null;
  pasesClave: number | null;
  regates: number | null;
  entradas: number | null;
  ratingWhoScored: number | null;
}

export interface WhoScoredIdentidad {
  playerIdExterno: string;
  nombre: string;
  equipo: string;
  liga: string;
}

export interface WhoScoredLookupResult {
  estado: WhoScoredEstado;
  identidad?: WhoScoredIdentidad;
  metricas?: WhoScoredMetricas;
  detalle?: string;
}

export interface WhoScoredOperationContext {
  signal: AbortSignal;
  deadlineAt: number;
}

export interface WhoScoredHttpResponse {
  status: number;
  body: string;
}

export interface WhoScoredTransport {
  get(url: string, signal: AbortSignal): Promise<WhoScoredHttpResponse>;
}
