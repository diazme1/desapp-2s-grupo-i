import { Cotizacion } from '../../market/domain/cotizacion';

export type TipoTransaccionMercado = 'COMPRA' | 'VENTA';

export interface TransaccionMercadoSnapshot {
  idOperacion: string;
  tipo: TipoTransaccionMercado;
  claveIdempotencia: string;
  compradorId: string;
  vendedorId: string;
  jugadorId: string;
  cantidadTokens: number;
  cotizacion: Cotizacion;
  importeCreditos: bigint;
  estrategia: string;
  idVersionEstrategia: string;
  idRecalculo: string;
  fechaHora: Date;
}

export interface AuditoriaTransaccionSnapshot extends TransaccionMercadoSnapshot {
  idAuditoria: string;
}
