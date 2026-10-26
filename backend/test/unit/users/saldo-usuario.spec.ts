import { Creditos } from '../../../src/market/domain/creditos';
import { SaldoUsuario } from '../../../src/users/domain/saldo-usuario';

describe('SaldoUsuario', () => {
  it('acredita y debita sin perder exactitud', () => {
    const saldo = SaldoUsuario.crear({
      usuarioId: 'user-id',
      creditosDisponibles: Creditos.inicial(),
    });
    expect(saldo.debitar(Creditos.fromDecimal('0.25')).creditosDisponibles.toUnidades()).toBe(999975n);
    expect(saldo.acreditar(Creditos.fromDecimal('0.25')).creditosDisponibles.toUnidades()).toBe(1_000_025n);
  });
});
