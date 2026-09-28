export interface WhoScoredMetricas {
  goles: number | null;
  asistencias: number | null;
  tiros: number | null;
  pasesClave: number | null;
  regates: number | null;
  faltasCometidas: number | null;
  ratingWhoScored: number | null;
}

export interface WhoScoredLeagueLookupInput {
  liga: string;
}

export interface WhoScoredPlayerStats {
  playerIdExterno?: string;
  nombre: string;
  equipo: string;
  liga: string;
  metricas: WhoScoredMetricas;
}

export type WhoScoredLeagueEstado =
  | 'exito'
  | 'fuente_no_disponible'
  | 'estructura_inesperada'
  | 'liga_no_configurada';

export interface WhoScoredLeagueLookupResult {
  estado: WhoScoredLeagueEstado;
  jugadores?: WhoScoredPlayerStats[];
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

export interface WhoScoredLeagueTransport {
  getLeagueFeed(
    input: WhoScoredLeagueLookupInput,
    context: WhoScoredOperationContext,
  ): Promise<WhoScoredHttpResponse>;
}
