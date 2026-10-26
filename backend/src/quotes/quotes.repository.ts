import { Cotizacion } from '../market/domain/cotizacion';

export const QUOTE_HISTORY_REPOSITORY = Symbol('QUOTE_HISTORY_REPOSITORY');

export interface QuoteHistoryItem {
  id: string;
  jugadorId: string;
  fechaHora: Date;
  cotizacion: number | Cotizacion;
  tipoEstrategia: string;
  idVersionEstrategia: string;
  idRecalculo: string | null;
  idEstadistica: string | null;
}

export interface QuoteHistoryRepository {
  listarHistorialJugador(
    jugadorId: string,
    page: number,
    limit: number,
  ): Promise<{ items: QuoteHistoryItem[]; total: number } | null>;
}
