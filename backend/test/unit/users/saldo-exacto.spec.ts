import { Creditos } from '../../../src/market/domain/creditos';
import { SaldoExacto } from '../../../src/users/domain/saldo-exacto';
import { SaldoUsuario } from '../../../src/users/domain/saldo-usuario';
import { UserRole } from '../../../src/users/domain/user';

describe('SaldoExacto', () => {
  it('conserva exactitud con signo', () => {
    const saldo = SaldoExacto.fromDecimal('-12.34');

    expect(saldo.toUnidades()).toBe(-1234n);
    expect(saldo.toDecimalString()).toBe('-12.34');
    expect(saldo.sumar(Creditos.fromDecimal('1.00')).toDecimalString()).toBe(
      '-11.34',
    );
  });

  it('permite saldo negativo solo a un superadmin', () => {
    expect(() =>
      SaldoUsuario.crear({
        usuarioId: 'user-id',
        creditosDisponibles: SaldoExacto.fromDecimal('-0.01'),
      }),
    ).toThrow('El saldo de un usuario común no puede quedar negativo.');

    const saldo = SaldoUsuario.crear({
      usuarioId: 'admin-id',
      rol: UserRole.SUPERADMIN,
      creditosDisponibles: SaldoExacto.fromDecimal('-0.01'),
    });
    expect(saldo.creditosDisponibles.toDecimalString()).toBe('-0.01');
  });
});
