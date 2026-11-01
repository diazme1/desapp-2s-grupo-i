import type {
  TipoTransaccionMercado,
  TransaccionMercadoSnapshot,
} from '../orders/domain/transaccion-mercado';

export const TRANSACTIONS_REPOSITORY = Symbol('TRANSACTIONS_REPOSITORY');

export type PublicTransactionSnapshot = Pick<
  TransaccionMercadoSnapshot,
  | 'idOperacion'
  | 'tipo'
  | 'jugadorId'
  | 'cantidadTokens'
  | 'cotizacion'
  | 'importeCreditos'
  | 'fechaHora'
> & {
  nombreCompleto: string | null;
};

export interface TransactionHistoryRow
  extends Omit<PublicTransactionSnapshot, 'cotizacion'> {
  cotizacion: string;
}

export interface TransactionsReadModel {
  usuarioId: string;
  usuarioExiste: boolean;
  operaciones: TransactionHistoryRow[];
}

export interface TransactionsRepository {
  consultar(usuarioId: string): Promise<TransactionsReadModel>;
}

export type { TipoTransaccionMercado };
