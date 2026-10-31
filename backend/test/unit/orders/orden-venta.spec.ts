import { Cotizacion } from '../../../src/market/domain/cotizacion';
import { Creditos } from '../../../src/market/domain/creditos';
import { TokenJugador } from '../../../src/market/domain/token-jugador';
import { TenenciaJugador } from '../../../src/market/domain/tenencia-jugador';
import { Jugador } from '../../../src/players/domain/jugador';
import { SaldoExacto } from '../../../src/users/domain/saldo-exacto';
import { SaldoUsuario } from '../../../src/users/domain/saldo-usuario';
import { User, UserRole } from '../../../src/users/domain/user';
import { OrdenVenta } from '../../../src/orders/domain/orden-venta';

const vendedor = User.create({
  id: '00000000-0000-4000-8000-000000000001',
  correo: 'seller@example.com',
  passwordHash: 'hash',
});
const comprador = User.create({
  id: '00000000-0000-4000-8000-000000000002',
  correo: 'admin@example.com',
  passwordHash: 'hash',
  rol: UserRole.SUPERADMIN,
});
const jugador = Jugador.crear({
  id: '00000000-0000-4000-8000-000000000003',
  proveedorId: 1,
  equipoId: '00000000-0000-4000-8000-000000000004',
  nombre: 'Jugador',
});
const quote = {
  estrategia: 'ataque_decisivo',
  idVersionEstrategia: '00000000-0000-4000-8000-000000000005',
  idRecalculo: '00000000-0000-4000-8000-000000000006',
  cotizacion: Cotizacion.fromDecimal('12.34'),
  fechaHora: new Date('2026-01-01T00:00:00.000Z'),
};

function input(
  overrides: Partial<Parameters<typeof OrdenVenta.ejecutar>[0]> = {},
) {
  const tokens = Array.from({ length: 5 }, (_, index) =>
    TokenJugador.emitir({
      idToken: `00000000-0000-4000-8000-0000000001${index}`,
      jugadorId: jugador.id,
      usuarioOwnerId: vendedor.id,
      numeroEmision: index + 1,
      loteEmisionId: '00000000-0000-4000-8000-000000000099',
    }),
  );
  return {
    claveIdempotencia: 'sell-1',
    cantidadTokens: 2,
    comprador,
    vendedor,
    jugador,
    quote,
    saldoComprador: null,
    saldoVendedor: SaldoUsuario.crear({
      usuarioId: vendedor.id,
      creditosDisponibles: Creditos.fromDecimal('0.00'),
    }),
    tokensJugador: tokens,
    tenenciaComprador: null,
    tenenciaVendedor: TenenciaJugador.crear({
      usuarioId: vendedor.id,
      jugadorId: jugador.id,
      cantidadTokens: 5,
    }),
    ordenExistente: null,
    ...overrides,
  };
}

describe('OrdenVenta', () => {
  it('transfiere tokens, acredita al vendedor y permite saldo negativo al superadmin', () => {
    const resultado = OrdenVenta.ejecutar(input());

    expect(resultado.tipo).toBe('confirmada');
    expect(resultado.orden.tipo).toBe('VENTA');
    expect(resultado.orden.importeCreditos).toBe(2468n);
    expect(resultado.tokensTransferidos).toHaveLength(2);
    expect(
      resultado.tokensTransferidos.every(
        (token) => token.usuarioOwnerId === comprador.id,
      ),
    ).toBe(true);
    expect(resultado.tenenciaVendedor?.cantidadTokens).toBe(3);
    expect(resultado.tenenciaComprador?.cantidadTokens).toBe(2);
    expect(resultado.saldoVendedor?.creditosDisponibles.toUnidades()).toBe(
      2468n,
    );
    expect(resultado.saldoComprador?.creditosDisponibles.toUnidades()).toBe(
      -2468n,
    );
  });

  it('devuelve replay sin volver a transferir', () => {
    const primera = OrdenVenta.ejecutar(input());
    const replay = OrdenVenta.ejecutar(
      input({ ordenExistente: { ...primera.orden } }),
    );

    expect(replay.tipo).toBe('replay');
    expect(replay.orden.idOperacion).toBe(primera.orden.idOperacion);
    expect(replay.tokensTransferidos).toHaveLength(0);
  });

  it('rechaza una tenencia insuficiente', () => {
    expect(() =>
      OrdenVenta.ejecutar(
        input({
          cantidadTokens: 6,
          tenenciaVendedor: TenenciaJugador.crear({
            usuarioId: vendedor.id,
            jugadorId: jugador.id,
            cantidadTokens: 5,
          }),
        }),
      ),
    ).toThrow(expect.objectContaining({ code: 'TOKENS_INSUFICIENTES' }));
  });

  it('rechaza saldo de vendedor ausente y no exige saldo del comprador', () => {
    expect(() => OrdenVenta.ejecutar(input({ saldoVendedor: null }))).toThrow(
      expect.objectContaining({ code: 'VENDEDOR_INVALIDO' }),
    );
    const resultado = OrdenVenta.ejecutar(
      input({
        saldoComprador: SaldoUsuario.crear({
          usuarioId: comprador.id,
          rol: UserRole.SUPERADMIN,
          creditosDisponibles: SaldoExacto.fromDecimal('-100.00'),
        }),
      }),
    );
    expect(resultado.saldoComprador?.creditosDisponibles.toUnidades()).toBe(
      -12468n,
    );
  });
});
