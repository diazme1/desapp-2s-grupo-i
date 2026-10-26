import { Creditos } from '../../../src/market/domain/creditos';

describe('Creditos', () => {
  it('representa el saldo en unidades mínimas exactas', () => {
    expect(Creditos.inicial().toUnidades()).toBe(1_000_000n);
    expect(Creditos.fromDecimal('10000.00').toDecimalString()).toBe('10000.00');
    expect(Creditos.fromDecimal('1.5').toUnidades()).toBe(150n);
  });

  it('protege saldos negativos y operaciones que exceden el saldo', () => {
    expect(() => Creditos.fromDecimal('-1.00')).toThrow();
    expect(() => Creditos.fromUnidades(-1n)).toThrow();
    expect(() => Creditos.fromDecimal('1.00').restar(Creditos.fromDecimal('1.01'))).toThrow();
  });
});
