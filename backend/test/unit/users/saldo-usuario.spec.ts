import { Creditos } from '../../../src/market/domain/creditos';
import { SaldoUsuario } from '../../../src/users/domain/saldo-usuario';
import { UserRole } from '../../../src/users/domain/user';
import { SaldoExacto } from '../../../src/users/domain/saldo-exacto';

describe('SaldoUsuario', () => {
  it('acredita y debita sin perder exactitud', () => {
    const saldo = SaldoUsuario.crear({
      usuarioId: 'user-id',
      creditosDisponibles: Creditos.inicial(),
    });
    expect(
      saldo
        .debitar(Creditos.fromDecimal('0.25'))
        .creditosDisponibles.toUnidades(),
    ).toBe(99_975n);
    expect(
      saldo
        .acreditar(Creditos.fromDecimal('0.25'))
        .creditosDisponibles.toUnidades(),
    ).toBe(100_025n);
  });

  it('rechaza saldo negativo común y permite débito negativo del superadmin', () => {
    expect(() =>
      SaldoUsuario.crear({
        usuarioId: 'user-id',
        creditosDisponibles: SaldoExacto.fromUnidades(-1n),
      }),
    ).toThrow('El saldo de un usuario común no puede quedar negativo.');

    const superadmin = SaldoUsuario.crear({
      usuarioId: 'admin-id',
      rol: UserRole.SUPERADMIN,
      creditosDisponibles: Creditos.fromDecimal('0.00'),
    });
    expect(
      superadmin
        .debitar(Creditos.fromDecimal('1.00'))
        .creditosDisponibles.toUnidades(),
    ).toBe(-100n);
  });
});
