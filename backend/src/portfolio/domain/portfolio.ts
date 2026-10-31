import { Cotizacion } from '../../market/domain/cotizacion';
import type {
  PortfolioReadModel,
  PortfolioTransactionRead,
} from '../portfolio.repository';

export type PortfolioDomainErrorCode =
  'TENENCIAS_INCONSISTENTES' | 'COTIZACION_FALTANTE';

export class PortfolioDomainError extends Error {
  constructor(
    readonly code: PortfolioDomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'PortfolioDomainError';
  }
}

export class DecimalExacto {
  private constructor(
    private readonly numerador: bigint,
    private readonly denominador: bigint,
  ) {
    if (denominador <= 0n) throw new Error('El denominador debe ser positivo.');
  }

  static fromUnidades(unidades: bigint): DecimalExacto {
    return new DecimalExacto(unidades, 1n);
  }

  dividirEntero(divisor: bigint): DecimalExacto {
    if (divisor <= 0n) throw new Error('El divisor debe ser positivo.');
    return new DecimalExacto(this.numerador, this.denominador * divisor);
  }

  multiplicarEntero(factor: bigint): DecimalExacto {
    return new DecimalExacto(this.numerador * factor, this.denominador);
  }

  restar(otro: DecimalExacto): DecimalExacto {
    return new DecimalExacto(
      this.numerador * otro.denominador - otro.numerador * this.denominador,
      this.denominador * otro.denominador,
    );
  }

  toDecimalStringHalfUp(): string {
    const unidades = roundHalfUp(this.numerador, this.denominador);
    const signo = unidades < 0n ? '-' : '';
    const absolutas = unidades < 0n ? -unidades : unidades;
    return `${signo}${absolutas / 100n}.${(absolutas % 100n)
      .toString()
      .padStart(2, '0')}`;
  }
}

export interface PosicionPortfolioCalculada {
  idJugador: string;
  cantidadTokens: number;
  cotizacionVigente: Cotizacion;
  precioPromedioCompra: DecimalExacto | null;
  costoDeAdquisicion: DecimalExacto | null;
  valorActual: DecimalExacto;
  gananciaPerdida: DecimalExacto | null;
}

export class Portfolio {
  static calcular(readModel: PortfolioReadModel): PosicionPortfolioCalculada[] {
    const conteosTokens = new Map(
      readModel.conteosTokens.map((item) => [
        item.jugadorId,
        item.cantidadTokens,
      ]),
    );
    const cotizaciones = new Map(
      readModel.cotizaciones.map((item) => [item.jugadorId, item.cotizacion]),
    );
    const posiciones = [...readModel.tenencias]
      .filter((tenencia) => tenencia.cantidadTokens > 0)
      .sort((a, b) => a.jugadorId.localeCompare(b.jugadorId));

    return posiciones.map((tenencia) => {
      if (conteosTokens.get(tenencia.jugadorId) !== tenencia.cantidadTokens) {
        throw new PortfolioDomainError(
          'TENENCIAS_INCONSISTENTES',
          'La tenencia no coincide con los tokens individuales.',
        );
      }

      const cotizacion = cotizaciones.get(tenencia.jugadorId);
      if (!cotizacion) {
        throw new PortfolioDomainError(
          'COTIZACION_FALTANTE',
          'No existe una cotización vigente para el jugador.',
        );
      }

      const compras = readModel.transacciones.filter(
        (transaccion) =>
          transaccion.jugadorId === tenencia.jugadorId &&
          transaccion.tipo === 'COMPRA',
      );
      const promedio = calcularPromedio(compras);
      const costoDeAdquisicion =
        promedio?.multiplicarEntero(BigInt(tenencia.cantidadTokens)) ?? null;
      const valorActual = DecimalExacto.fromUnidades(
        cotizacion.toUnidades(),
      ).multiplicarEntero(BigInt(tenencia.cantidadTokens));
      const gananciaPerdida = costoDeAdquisicion
        ? valorActual.restar(costoDeAdquisicion)
        : null;

      return {
        idJugador: tenencia.jugadorId,
        cantidadTokens: tenencia.cantidadTokens,
        cotizacionVigente: cotizacion,
        precioPromedioCompra: promedio,
        costoDeAdquisicion,
        valorActual,
        gananciaPerdida,
      };
    });
  }
}

function calcularPromedio(
  compras: PortfolioTransactionRead[],
): DecimalExacto | null {
  if (compras.length === 0) return null;

  let cantidadTotal = 0n;
  let importeTotalEnUnidades = 0n;
  for (const compra of compras) {
    cantidadTotal += BigInt(compra.cantidadTokens);
    importeTotalEnUnidades +=
      BigInt(compra.cantidadTokens) * compra.cotizacion.toUnidades();
  }
  if (cantidadTotal === 0n) return null;
  return DecimalExacto.fromUnidades(importeTotalEnUnidades).dividirEntero(
    cantidadTotal,
  );
}

function roundHalfUp(numerador: bigint, denominador: bigint): bigint {
  const signo = numerador < 0n ? -1n : 1n;
  const absoluto = numerador < 0n ? -numerador : numerador;
  const entero = absoluto / denominador;
  const resto = absoluto % denominador;
  const redondeado = resto * 2n >= denominador ? entero + 1n : entero;
  return signo * redondeado;
}
