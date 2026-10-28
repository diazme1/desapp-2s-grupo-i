import { TenenciaJugador } from './domain/tenencia-jugador';
import { TokenJugador } from './domain/token-jugador';
import { QuoteOpeningTransaction } from '../quotes/quote-opening-writer';
import { Cotizacion } from './domain/cotizacion';

export const MARKET_REPOSITORY = Symbol('MARKET_REPOSITORY');

export interface PersistedOpening {
  cotizacion: Cotizacion;
  idVersionEstrategia: string;
  idRecalculo: string | null;
  idEstadistica: string | null;
}

export interface MarketTransaction extends QuoteOpeningTransaction {
  bloquearJugador(jugadorId: string): Promise<boolean>;
  listarTokens(jugadorId: string): Promise<TokenJugador[]>;
  listarTenencias(jugadorId: string): Promise<TenenciaJugador[]>;
  obtenerApertura(jugadorId: string): Promise<PersistedOpening | null>;
  insertarTokens(tokens: TokenJugador[]): Promise<void>;
  insertarTenencia(tenencia: TenenciaJugador): Promise<void>;
}

export interface MarketRepository {
  listarIdsJugadores(): Promise<string[]>;
  listarIdsJugadoresConEstadisticas(): Promise<string[]>;
  enTransaccion<T>(work: (transaction: MarketTransaction) => Promise<T>): Promise<T>;
}
