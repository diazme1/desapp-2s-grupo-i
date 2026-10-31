import { ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cotizacion } from '../../../src/market/domain/cotizacion';
import { Creditos } from '../../../src/market/domain/creditos';
import { TokenJugador } from '../../../src/market/domain/token-jugador';
import { TenenciaJugador } from '../../../src/market/domain/tenencia-jugador';
import { Jugador } from '../../../src/players/domain/jugador';
import { User, UserRole } from '../../../src/users/domain/user';
import { SaldoUsuario } from '../../../src/users/domain/saldo-usuario';
import { OrdersService } from '../../../src/orders/orders.service';
import type {
  LockedBuyContext,
  LockedSellContext,
  OrdersRepository,
  OrdersUnitOfWork,
} from '../../../src/orders/orders.repository';

const buyer = User.create({
  id: '00000000-0000-4000-8000-000000000001',
  correo: 'buyer@example.com',
  passwordHash: 'hash',
});
const seller = User.create({
  id: '00000000-0000-4000-8000-000000000002',
  correo: 'admin@example.com',
  passwordHash: 'hash',
  rol: UserRole.SUPERADMIN,
});
const player = Jugador.crear({
  id: '00000000-0000-4000-8000-000000000003',
  proveedorId: 1,
  equipoId: '00000000-0000-4000-8000-000000000004',
  nombre: 'Jugador',
});

function context(overrides: Partial<LockedBuyContext> = {}): LockedBuyContext {
  const tokens = [
    TokenJugador.emitir({
      idToken: '00000000-0000-4000-8000-000000000010',
      jugadorId: player.id,
      usuarioOwnerId: seller.id,
      numeroEmision: 1,
      loteEmisionId: '00000000-0000-4000-8000-000000000099',
    }),
  ];
  return {
    comprador: buyer,
    vendedor: seller,
    jugador: player,
    quote: {
      estrategia: 'ataque_decisivo',
      idVersionEstrategia: '00000000-0000-4000-8000-000000000005',
      idRecalculo: '00000000-0000-4000-8000-000000000006',
      cotizacion: Cotizacion.fromDecimal('12.34'),
      fechaHora: new Date('2026-01-01T00:00:00.000Z'),
    },
    saldoComprador: SaldoUsuario.crear({
      usuarioId: buyer.id,
      creditosDisponibles: Creditos.fromDecimal('100.00'),
    }),
    saldoVendedor: null,
    tokensJugador: tokens,
    tenenciaComprador: null,
    tenenciaVendedor: TenenciaJugador.crear({
      usuarioId: seller.id,
      jugadorId: player.id,
      cantidadTokens: 1,
    }),
    ordenExistente: null,
    ...overrides,
  };
}

function setup(initial: LockedBuyContext = context()) {
  const unitOfWork: OrdersUnitOfWork = {
    bloquearYcargarCompra: jest.fn().mockResolvedValue(initial),
    bloquearYcargarVenta: jest
      .fn()
      .mockResolvedValue(initial as LockedSellContext),
    resolverCotizacionVigente: jest.fn(),
    persistirCompra: jest.fn().mockResolvedValue(undefined),
    persistirVenta: jest.fn().mockResolvedValue(undefined),
  };
  const repository: OrdersRepository = {
    enTransaccion: jest.fn(async (work) => work(unitOfWork)),
  };
  const config = {
    get: jest.fn().mockReturnValue(seller.correo),
  } as unknown as ConfigService;
  return {
    service: new OrdersService(repository, config),
    repository,
    unitOfWork,
  };
}

describe('OrdersService', () => {
  it('coordina la UoW y delega la decisión de compra al dominio', async () => {
    const setupData = setup();

    const response = await setupData.service.comprar(
      buyer.id,
      { idJugador: player.id, cantidadTokens: 1 },
      '  buy-1  ',
    );

    expect(setupData.repository.enTransaccion).toHaveBeenCalledTimes(1);
    expect(setupData.unitOfWork.bloquearYcargarCompra).toHaveBeenCalledWith(
      expect.objectContaining({ claveIdempotencia: '  buy-1  ' }),
    );
    expect(setupData.unitOfWork.persistirCompra).toHaveBeenCalledTimes(1);
    expect(response.importe).toBe('12.34');
  });

  it('traduce una ausencia técnica del jugador', async () => {
    const setupData = setup(context({ jugador: null }));

    await expect(
      setupData.service.comprar(
        buyer.id,
        { idJugador: player.id, cantidadTokens: 1 },
        'buy-2',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(setupData.unitOfWork.persistirCompra).not.toHaveBeenCalled();
  });

  it('no decide saldo suficiente: delega la regla al modelo', async () => {
    const setupData = setup(
      context({
        saldoComprador: SaldoUsuario.crear({
          usuarioId: buyer.id,
          creditosDisponibles: Creditos.fromDecimal('1.00'),
        }),
      }),
    );

    await expect(
      setupData.service.comprar(
        buyer.id,
        { idJugador: player.id, cantidadTokens: 1 },
        'buy-3',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(setupData.unitOfWork.persistirCompra).not.toHaveBeenCalled();
  });

  it('coordina la UoW de venta y no exige saldo disponible del superadmin', async () => {
    const base = context();
    const saleContext: LockedBuyContext = {
      ...base,
      comprador: seller,
      vendedor: buyer,
      saldoComprador: null,
      saldoVendedor: SaldoUsuario.crear({
        usuarioId: buyer.id,
        creditosDisponibles: Creditos.fromDecimal('0.00'),
      }),
      tokensJugador: base.tokensJugador.map((token) =>
        token.transferirA(buyer.id),
      ),
      tenenciaComprador: null,
      tenenciaVendedor: TenenciaJugador.crear({
        usuarioId: buyer.id,
        jugadorId: player.id,
        cantidadTokens: 1,
      }),
    };
    const setupData = setup(saleContext);

    const response = await setupData.service.vender(
      buyer.id,
      { idJugador: player.id, cantidadTokens: 1 },
      'sell-1',
    );

    expect(setupData.unitOfWork.bloquearYcargarVenta).toHaveBeenCalledWith(
      expect.objectContaining({
        vendedorId: buyer.id,
        claveIdempotencia: 'sell-1',
      }),
    );
    expect(setupData.unitOfWork.persistirVenta).toHaveBeenCalledTimes(1);
    expect(response.importe).toBe('12.34');
  });
});
