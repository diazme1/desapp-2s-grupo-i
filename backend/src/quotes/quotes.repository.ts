export const QUOTE_HISTORY_REPOSITORY = Symbol('QUOTE_HISTORY_REPOSITORY');

export interface QuoteHistoryItem {
  id: string;
  jugadorId: string;
  fechaHora: Date;
  cotizacion: number;
  tipoEstrategia: string;
  idVersionEstrategia: string;
  idRecalculo: string;
  idEstadistica: string;
}

export interface QuoteHistoryRepository {
  listarHistorialJugador(
    jugadorId: string,
    page: number,
    limit: number,
  ): Promise<{ items: QuoteHistoryItem[]; total: number } | null>;
}
