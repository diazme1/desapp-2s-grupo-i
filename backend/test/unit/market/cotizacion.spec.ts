import { Cotizacion } from '../../../src/market/domain/cotizacion';

describe('Cotizacion', () => {
  it('parsea y formatea en unidades mínimas sin punto flotante', () => {
    expect(Cotizacion.fromDecimal('1.00').toUnidades()).toBe(100n);
    expect(Cotizacion.fromDecimal('83.75').toUnidades()).toBe(8375n);
    expect(Cotizacion.fromUnidades(8375n).toDecimalString()).toBe('83.75');
    expect(Cotizacion.APERTURA.toDecimalString()).toBe('1.00');
  });

  it('compara por unidades enteras', () => {
    expect(Cotizacion.fromDecimal('1.00').compareTo(Cotizacion.fromDecimal('1.01'))).toBe(-1);
    expect(Cotizacion.fromDecimal('1.01').compareTo(Cotizacion.fromDecimal('1.00'))).toBe(1);
    expect(Cotizacion.fromDecimal('1.00').compareTo(Cotizacion.APERTURA)).toBe(0);
  });

  it.each(['', ' 1.00', '1.000', '1e2', '-1.00', '1,00'])(
    'rechaza el valor inválido %s',
    (value) => expect(() => Cotizacion.fromDecimal(value)).toThrow(),
  );

  it('acepta el máximo de numeric(14,2) y rechaza el siguiente centavo', () => {
    expect(Cotizacion.fromDecimal('999999999999.99').toUnidades()).toBe(99_999_999_999_999n);
    expect(() => Cotizacion.fromDecimal('1000000000000.00')).toThrow();
    expect(() => Cotizacion.fromUnidades(100_000_000_000_000n)).toThrow();
  });
});
