import { Cotizacion } from '../../../src/market/domain/cotizacion';
import {
  Portfolio,
  PortfolioDomainError,
  type PortfolioReadModel,
} from '../../../src/portfolio/domain/portfolio';

const usuarioId = '00000000-0000-4000-8000-000000000001';
const jugadorA = '00000000-0000-4000-8000-00000000000a';
const jugadorB = '00000000-0000-4000-8000-00000000000b';

function readModel(
  overrides: Partial<PortfolioReadModel> = {},
): PortfolioReadModel {
  return {
    usuarioId,
    usuarioExiste: true,
    tenencias: [],
    conteosTokens: [],
    cotizaciones: [],
    transacciones: [],
    ...overrides,
  };
}

describe('Portfolio', () => {
  it('devuelve posiciones vacías cuando no hay tenencias positivas', () => {
    expect(Portfolio.calcular(readModel())).toEqual([]);
  });

  it('calcula promedio ponderado, valor actual y ganancia positiva', () => {
    const posiciones = Portfolio.calcular(
      readModel({
        tenencias: [{ jugadorId: jugadorA, cantidadTokens: 2 }],
        conteosTokens: [{ jugadorId: jugadorA, cantidadTokens: 2 }],
        cotizaciones: [
          { jugadorId: jugadorA, cotizacion: Cotizacion.fromDecimal('15.00') },
        ],
        transacciones: [
          {
            jugadorId: jugadorA,
            tipo: 'COMPRA',
            cantidadTokens: 1,
            cotizacion: Cotizacion.fromDecimal('10.00'),
          },
          {
            jugadorId: jugadorA,
            tipo: 'COMPRA',
            cantidadTokens: 1,
            cotizacion: Cotizacion.fromDecimal('12.00'),
          },
        ],
      }),
    );

    expect(posiciones).toHaveLength(1);
    expect(posiciones[0].precioPromedioCompra?.toDecimalStringHalfUp()).toBe(
      '11.00',
    );
    expect(posiciones[0].costoDeAdquisicion?.toDecimalStringHalfUp()).toBe(
      '22.00',
    );
    expect(posiciones[0].valorActual.toDecimalStringHalfUp()).toBe('30.00');
    expect(posiciones[0].gananciaPerdida?.toDecimalStringHalfUp()).toBe('8.00');
  });

  it('ignora las ventas al calcular el promedio', () => {
    const posiciones = Portfolio.calcular(
      readModel({
        tenencias: [{ jugadorId: jugadorA, cantidadTokens: 2 }],
        conteosTokens: [{ jugadorId: jugadorA, cantidadTokens: 2 }],
        cotizaciones: [
          { jugadorId: jugadorA, cotizacion: Cotizacion.fromDecimal('15.00') },
        ],
        transacciones: [
          {
            jugadorId: jugadorA,
            tipo: 'COMPRA',
            cantidadTokens: 2,
            cotizacion: Cotizacion.fromDecimal('10.00'),
          },
          {
            jugadorId: jugadorA,
            tipo: 'VENTA',
            cantidadTokens: 1,
            cotizacion: Cotizacion.fromDecimal('2.00'),
          },
        ],
      }),
    );

    expect(posiciones[0].precioPromedioCompra?.toDecimalStringHalfUp()).toBe(
      '10.00',
    );
  });

  it('calcula la ganancia con precisión exacta antes de serializar', () => {
    const posiciones = Portfolio.calcular(
      readModel({
        tenencias: [{ jugadorId: jugadorA, cantidadTokens: 3 }],
        conteosTokens: [{ jugadorId: jugadorA, cantidadTokens: 3 }],
        cotizaciones: [
          { jugadorId: jugadorA, cotizacion: Cotizacion.fromDecimal('10.01') },
        ],
        transacciones: [
          {
            jugadorId: jugadorA,
            tipo: 'COMPRA',
            cantidadTokens: 1,
            cotizacion: Cotizacion.fromDecimal('10.00'),
          },
          {
            jugadorId: jugadorA,
            tipo: 'COMPRA',
            cantidadTokens: 2,
            cotizacion: Cotizacion.fromDecimal('10.01'),
          },
        ],
      }),
    );

    expect(posiciones[0].precioPromedioCompra?.toDecimalStringHalfUp()).toBe(
      '10.01',
    );
    expect(posiciones[0].costoDeAdquisicion?.toDecimalStringHalfUp()).toBe(
      '30.02',
    );
    expect(posiciones[0].valorActual.toDecimalStringHalfUp()).toBe('30.03');
    expect(posiciones[0].gananciaPerdida?.toDecimalStringHalfUp()).toBe('0.01');
  });

  it('representa ausencia de compras con importes nulos de costo', () => {
    const [posicion] = Portfolio.calcular(
      readModel({
        tenencias: [{ jugadorId: jugadorA, cantidadTokens: 2 }],
        conteosTokens: [{ jugadorId: jugadorA, cantidadTokens: 2 }],
        cotizaciones: [
          { jugadorId: jugadorA, cotizacion: Cotizacion.fromDecimal('15.00') },
        ],
      }),
    );

    expect(posicion.precioPromedioCompra).toBeNull();
    expect(posicion.costoDeAdquisicion).toBeNull();
    expect(posicion.gananciaPerdida).toBeNull();
    expect(posicion.valorActual.toDecimalStringHalfUp()).toBe('30.00');
  });

  it('ordena las posiciones por idJugador', () => {
    const posiciones = Portfolio.calcular(
      readModel({
        tenencias: [
          { jugadorId: jugadorB, cantidadTokens: 1 },
          { jugadorId: jugadorA, cantidadTokens: 1 },
        ],
        conteosTokens: [
          { jugadorId: jugadorB, cantidadTokens: 1 },
          { jugadorId: jugadorA, cantidadTokens: 1 },
        ],
        cotizaciones: [
          { jugadorId: jugadorB, cotizacion: Cotizacion.fromDecimal('12.00') },
          { jugadorId: jugadorA, cotizacion: Cotizacion.fromDecimal('11.00') },
        ],
      }),
    );

    expect(posiciones.map((position) => position.idJugador)).toEqual([
      jugadorA,
      jugadorB,
    ]);
  });

  it('rechaza una tenencia que no coincide con sus tokens individuales', () => {
    expect(() =>
      Portfolio.calcular(
        readModel({
          tenencias: [{ jugadorId: jugadorA, cantidadTokens: 2 }],
          conteosTokens: [{ jugadorId: jugadorA, cantidadTokens: 1 }],
          cotizaciones: [
            {
              jugadorId: jugadorA,
              cotizacion: Cotizacion.fromDecimal('15.00'),
            },
          ],
        }),
      ),
    ).toThrow(PortfolioDomainError);
  });

  it('rechaza la ausencia de cotización vigente', () => {
    expect(() =>
      Portfolio.calcular(
        readModel({
          tenencias: [{ jugadorId: jugadorA, cantidadTokens: 2 }],
          conteosTokens: [{ jugadorId: jugadorA, cantidadTokens: 2 }],
        }),
      ),
    ).toThrow(PortfolioDomainError);
  });

  it.each([
    ['positiva', '15.00', '8.00'],
    ['cero', '11.00', '0.00'],
    ['negativa', '10.00', '-2.00'],
  ])('calcula una ganancia %s', (_signo, cotizacion, esperado) => {
    const [posicion] = Portfolio.calcular(
      readModel({
        tenencias: [{ jugadorId: jugadorA, cantidadTokens: 2 }],
        conteosTokens: [{ jugadorId: jugadorA, cantidadTokens: 2 }],
        cotizaciones: [
          {
            jugadorId: jugadorA,
            cotizacion: Cotizacion.fromDecimal(cotizacion),
          },
        ],
        transacciones: [
          {
            jugadorId: jugadorA,
            tipo: 'COMPRA',
            cantidadTokens: 2,
            cotizacion: Cotizacion.fromDecimal('11.00'),
          },
        ],
      }),
    );

    expect(posicion.gananciaPerdida?.toDecimalStringHalfUp()).toBe(esperado);
  });
});
