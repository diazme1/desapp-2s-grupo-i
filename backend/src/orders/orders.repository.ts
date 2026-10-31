import { Cotizacion } from '../market/domain/cotizacion';
import { Jugador } from '../players/domain/jugador';
import { SaldoUsuario } from '../users/domain/saldo-usuario';
import { User } from '../users/domain/user';
import { TenenciaJugador } from '../market/domain/tenencia-jugador';
import { TokenJugador } from '../market/domain/token-jugador';
import type { BuyOrderResult } from './domain/orden-compra';
import type { SellOrderResult } from './domain/orden-venta';
import type { TransaccionMercadoSnapshot } from './domain/transaccion-mercado';

export const ORDERS_REPOSITORY = Symbol('ORDERS_REPOSITORY');

export interface ActiveQuoteSnapshot {
  estrategia: string;
  idVersionEstrategia: string;
  idRecalculo: string;
  cotizacion: Cotizacion;
  fechaHora: Date;
}

export interface ActiveQuoteResolver {
  resolverCotizacionVigente(
    jugadorId: string,
  ): Promise<ActiveQuoteSnapshot | null>;
}

export interface ExistingMarketTransaction extends TransaccionMercadoSnapshot {}

export type ExistingBuyOrder = ExistingMarketTransaction;

export interface LoadBuyContextInput {
  compradorId: string;
  vendedorEmail: string;
  jugadorId: string;
  claveIdempotencia: string;
}

export interface LockedBuyContext {
  comprador: User | null;
  vendedor: User | null;
  jugador: Jugador | null;
  quote: ActiveQuoteSnapshot | null;
  saldoComprador: SaldoUsuario | null;
  saldoVendedor: SaldoUsuario | null;
  tokensJugador: TokenJugador[];
  tenenciaComprador: TenenciaJugador | null;
  tenenciaVendedor: TenenciaJugador | null;
  ordenExistente: ExistingMarketTransaction | null;
}

export interface LoadSellContextInput {
  vendedorId: string;
  compradorEmail: string;
  jugadorId: string;
  claveIdempotencia: string;
}

export interface LockedSellContext {
  comprador: User | null;
  vendedor: User | null;
  jugador: Jugador | null;
  quote: ActiveQuoteSnapshot | null;
  saldoComprador: SaldoUsuario | null;
  saldoVendedor: SaldoUsuario | null;
  tokensJugador: TokenJugador[];
  tenenciaComprador: TenenciaJugador | null;
  tenenciaVendedor: TenenciaJugador | null;
  ordenExistente: ExistingMarketTransaction | null;
}

export interface OrdersUnitOfWork extends ActiveQuoteResolver {
  bloquearYcargarCompra(input: LoadBuyContextInput): Promise<LockedBuyContext>;
  persistirCompra(resultado: BuyOrderResult): Promise<void>;
  bloquearYcargarVenta(input: LoadSellContextInput): Promise<LockedSellContext>;
  persistirVenta(resultado: SellOrderResult): Promise<void>;
}

export interface OrdersRepository {
  enTransaccion<T>(
    work: (unitOfWork: OrdersUnitOfWork) => Promise<T>,
  ): Promise<T>;
}
