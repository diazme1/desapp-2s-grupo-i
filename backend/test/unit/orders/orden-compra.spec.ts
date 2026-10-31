import { Cotizacion } from '../../../src/market/domain/cotizacion';
import { Creditos } from '../../../src/market/domain/creditos';
import { TokenJugador } from '../../../src/market/domain/token-jugador';
import { TenenciaJugador } from '../../../src/market/domain/tenencia-jugador';
import { Jugador } from '../../../src/players/domain/jugador';
import { User, UserRole } from '../../../src/users/domain/user';
import { SaldoUsuario } from '../../../src/users/domain/saldo-usuario';
import {
  OrdenCompra,
  OrdenCompraDomainError,
} from '../../../src/orders/domain/orden-compra';

const comprador = User.create({
  id: '00000000-0000-4000-8000-000000000001',
  correo: 'buyer@example.com',
  passwordHash: 'hash',
});
const vendedor = User.create({
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
  overrides: Partial<Parameters<typeof OrdenCompra.ejecutar>[0]> = {},
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
    claveIdempotencia: 'buy-1',
    cantidadTokens: 2,
    comprador,
    vendedor,
    jugador,
    quote,
    saldoComprador: SaldoUsuario.crear({
      usuarioId: comprador.id,
      creditosDisponibles: Creditos.fromDecimal('100.00'),
    }),
    saldoVendedor: null,
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

describe('OrdenCompra', () => {
  it('transfiere tokens individuales, actualiza agregados y calcula exacto', () => {
    const resultado = OrdenCompra.ejecutar(input());

    expect(resultado.tipo).toBe('confirmada');
    expect(resultado.orden.tipo).toBe('COMPRA');
    expect(resultado.orden.cotizacion.toDecimalString()).toBe('12.34');
    expect(resultado.orden.importeCreditos).toBe(2468n);
    expect(resultado.tokensTransferidos).toHaveLength(2);
    expect(
      resultado.tokensTransferidos.every(
        (token) => token.usuarioOwnerId === comprador.id,
      ),
    ).toBe(true);
    expect(resultado.tenenciaComprador?.cantidadTokens).toBe(2);
    expect(resultado.tenenciaVendedor?.cantidadTokens).toBe(3);
    expect(resultado.saldoComprador?.creditosDisponibles.toUnidades()).toBe(
      7532n,
    );
    expect(resultado.saldoVendedor?.creditosDisponibles.toUnidades()).toBe(
      2468n,
    );
    expect(Object.isFrozen(resultado)).toBe(true);
  });

  it.each([
    ['comprador ausente', { comprador: null }, 'COMPRADOR_INVALIDO'],
    ['vendedor ausente', { vendedor: null }, 'VENDEDOR_INVALIDO'],
    ['jugador ausente', { jugador: null }, 'JUGADOR_INVALIDO'],
    ['cotización ausente', { quote: null }, 'COTIZACION_INVALIDA'],
    ['cantidad inválida', { cantidadTokens: 0 }, 'CANTIDAD_INVALIDA'],
    [
      'saldo insuficiente',
      {
        saldoComprador: SaldoUsuario.crear({
          usuarioId: comprador.id,
          creditosDisponibles: Creditos.fromDecimal('1.00'),
        }),
      },
      'SALDO_INSUFICIENTE',
    ],
    ['tokens insuficientes', { cantidadTokens: 6 }, 'TOKENS_INSUFICIENTES'],
    [
      'tenencia inconsistente',
      {
        tenenciaVendedor: TenenciaJugador.crear({
          usuarioId: vendedor.id,
          jugadorId: jugador.id,
          cantidadTokens: 4,
        }),
      },
      'TENENCIAS_INCONSISTENTES',
    ],
    ['partes iguales', { comprador: vendedor }, 'COMPRADOR_INVALIDO'],
  ] as const)('rechaza %s en el dominio', (_name, overrides, code) => {
    expect(() => OrdenCompra.ejecutar(input(overrides))).toThrow(
      expect.objectContaining({ code }),
    );
  });

  it('devuelve replay sin volver a transferir', () => {
    const primera = OrdenCompra.ejecutar(input());
    const replay = OrdenCompra.ejecutar(
      input({
        ordenExistente: {
          ...primera.orden,
        },
      }),
    );

    expect(replay.tipo).toBe('replay');
    expect(replay.orden.idOperacion).toBe(primera.orden.idOperacion);
    expect(replay.tokensTransferidos).toHaveLength(0);
  });

  it('rechaza reutilizar la clave con otro payload', () => {
    const primera = OrdenCompra.ejecutar(input());
    expect(() =>
      OrdenCompra.ejecutar(
        input({
          cantidadTokens: 3,
          ordenExistente: { ...primera.orden },
        }),
      ),
    ).toThrow(OrdenCompraDomainError);
  });
});
