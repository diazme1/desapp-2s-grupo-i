import { Cotizacion } from '../market/domain/cotizacion';

export const PORTFOLIO_REPOSITORY = Symbol('PORTFOLIO_REPOSITORY');

export interface PortfolioTenenciaRead {
  jugadorId: string;
  cantidadTokens: number;
}

export interface PortfolioTokenCountRead {
  jugadorId: string;
  cantidadTokens: number;
}

export interface PortfolioQuoteRead {
  jugadorId: string;
  cotizacion: Cotizacion;
}

export interface PortfolioTransactionRead {
  jugadorId: string;
  tipo: 'COMPRA' | 'VENTA';
  cantidadTokens: number;
  cotizacion: Cotizacion;
}

export interface PortfolioReadModel {
  usuarioId: string;
  usuarioExiste: boolean;
  tenencias: PortfolioTenenciaRead[];
  conteosTokens: PortfolioTokenCountRead[];
  cotizaciones: PortfolioQuoteRead[];
  transacciones: PortfolioTransactionRead[];
}

export interface PortfolioRepository {
  consultar(usuarioId: string): Promise<PortfolioReadModel>;
}
