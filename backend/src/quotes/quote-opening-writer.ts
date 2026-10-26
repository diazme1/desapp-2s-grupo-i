import { Cotizacion } from '../market/domain/cotizacion';

export const QUOTE_OPENING_WRITER = Symbol('QUOTE_OPENING_WRITER');

export interface QuoteOpening {
  id: string;
  jugadorId: string;
  fechaHora: Date;
  cotizacion: Cotizacion;
  idVersionEstrategia: string;
}

export interface QuoteOpeningPersistenceRow {
  id: string;
  jugadorId: string;
  fechaHora: Date;
  cotizacion: string;
  idVersionEstrategia: string;
  tipoEstrategia: 'apertura_mercado';
}

export interface QuoteOpeningTransaction {
  insertarApertura(row: QuoteOpeningPersistenceRow): Promise<void>;
}

export interface QuoteOpeningWriter {
  escribir(
    apertura: QuoteOpening,
    transaction: QuoteOpeningTransaction,
  ): Promise<void>;
}
