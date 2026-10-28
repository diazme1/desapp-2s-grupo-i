import { ConfigService } from '@nestjs/config';
import { User, UserRole } from '../../../src/users/domain/user';
import { Cotizacion } from '../../../src/market/domain/cotizacion';
import { MarketInitializationService } from '../../../src/market/market-initialization.service';
import { TokenJugador } from '../../../src/market/domain/token-jugador';
import { TenenciaJugador } from '../../../src/market/domain/tenencia-jugador';

const PLAYER_ID = 'player-id';
const SUPERADMIN = User.create({
  id: 'superadmin-id',
  correo: 'admin@example.com',
  passwordHash: 'hash',
  rol: UserRole.SUPERADMIN,
});

function makeService(options: {
  tokens?: TokenJugador[];
  tenencias?: TenenciaJugador[];
  apertura?: boolean;
  players?: string[];
  playersWithStats?: string[];
  requireStats?: boolean;
} = {}) {
  const writer = { escribir: jest.fn().mockResolvedValue(undefined) };
  const transaction = {
    bloquearJugador: jest.fn().mockResolvedValue(true),
    listarTokens: jest.fn().mockResolvedValue(options.tokens ?? []),
    listarTenencias: jest.fn().mockResolvedValue(options.tenencias ?? []),
    obtenerApertura: jest.fn().mockResolvedValue(
      options.apertura
        ? {
            cotizacion: Cotizacion.APERTURA,
            idVersionEstrategia: '5e0b8d31-36d4-4e5b-9a12-cd3a2bc8b9f1',
            idRecalculo: null,
            idEstadistica: null,
          }
        : null,
    ),
    insertarTokens: jest.fn().mockResolvedValue(undefined),
    insertarTenencia: jest.fn().mockResolvedValue(undefined),
    insertarApertura: jest.fn().mockResolvedValue(undefined),
  };
  const market = {
    listarIdsJugadores: jest.fn().mockResolvedValue(options.players ?? [PLAYER_ID]),
    listarIdsJugadoresConEstadisticas: jest.fn().mockResolvedValue(options.playersWithStats ?? []),
    enTransaccion: jest.fn().mockImplementation(async (work) => work(transaction)),
  };
  const superadminBootstrap = { ensureSuperadmin: jest.fn().mockResolvedValue(SUPERADMIN) };
  const users = { findByEmail: jest.fn().mockResolvedValue(SUPERADMIN) };
  const config = {
    get: jest.fn((key: string) =>
      key === 'MARKET_TOKENIZATION_REQUIRE_STATS'
        ? (options.requireStats ?? false)
        : 'admin@example.com',
    ),
  } as unknown as ConfigService;
  return {
    service: new MarketInitializationService(
      config,
      superadminBootstrap as any,
      users as any,
      market as any,
      writer as any,
    ),
    transaction,
    market,
    writer,
  };
}

describe('MarketInitializationService', () => {
  it('emite 100 tokens, crea tenencia y registra apertura de 100 unidades', async () => {
    const { service, transaction, writer } = makeService();

    await service.inicializar();

    expect(transaction.insertarTokens).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ numeroEmision: 1, usuarioOwnerId: SUPERADMIN.id }),
        expect.objectContaining({ numeroEmision: 100, usuarioOwnerId: SUPERADMIN.id }),
      ]),
    );
    expect(transaction.insertarTokens.mock.calls[0][0]).toHaveLength(100);
    expect(transaction.insertarTenencia).toHaveBeenCalledWith(
      expect.objectContaining({ usuarioId: SUPERADMIN.id, cantidadTokens: 100 }),
    );
    expect(writer.escribir).toHaveBeenCalledWith(
      expect.objectContaining({ cotizacion: Cotizacion.APERTURA }),
      transaction,
    );
  });

  it('no escribe ante una emisión completa y consistente', async () => {
    const tokens = Array.from({ length: 100 }, (_, index) =>
      TokenJugador.emitir({
        jugadorId: PLAYER_ID,
        usuarioOwnerId: SUPERADMIN.id,
        numeroEmision: index + 1,
        loteEmisionId: 'batch-id',
      }),
    );
    const { service, transaction, writer } = makeService({
      tokens,
      tenencias: [TenenciaJugador.crear({ usuarioId: SUPERADMIN.id, jugadorId: PLAYER_ID, cantidadTokens: 100 })],
      apertura: true,
    });

    await service.inicializar();

    expect(transaction.insertarTokens).not.toHaveBeenCalled();
    expect(transaction.insertarTenencia).not.toHaveBeenCalled();
    expect(writer.escribir).not.toHaveBeenCalled();
  });

  it('rechaza una emisión parcial sin intentar completarla', async () => {
    const tokens = [TokenJugador.emitir({ jugadorId: PLAYER_ID, usuarioOwnerId: SUPERADMIN.id, numeroEmision: 1, loteEmisionId: 'batch-id' })];
    const { service, transaction, writer } = makeService({ tokens });

    await expect(service.inicializar()).rejects.toThrow('incompleta');
    expect(transaction.insertarTokens).not.toHaveBeenCalled();
    expect(writer.escribir).not.toHaveBeenCalled();
  });

  it('rechaza una emisión completa con tenencia inconsistente', async () => {
    const tokens = Array.from({ length: 100 }, (_, index) =>
      TokenJugador.emitir({
        jugadorId: PLAYER_ID,
        usuarioOwnerId: SUPERADMIN.id,
        numeroEmision: index + 1,
        loteEmisionId: 'batch-id',
      }),
    );
    const { service, writer } = makeService({
      tokens,
      tenencias: [TenenciaJugador.crear({ usuarioId: SUPERADMIN.id, jugadorId: PLAYER_ID, cantidadTokens: 99 })],
      apertura: true,
    });

    await expect(service.inicializar()).rejects.toThrow('inconsistentes');
    expect(writer.escribir).not.toHaveBeenCalled();
  });

  it('finaliza correctamente sin jugadores y no deja datos', async () => {
    const { service, transaction, writer } = makeService({ players: [] });

    await expect(service.inicializar()).resolves.toBeUndefined();
    expect(transaction.bloquearJugador).not.toHaveBeenCalled();
    expect(writer.escribir).not.toHaveBeenCalled();
  });

  it('cuando la configuración lo exige, procesa solo jugadores con estadísticas', async () => {
    const { service, market, transaction } = makeService({
      requireStats: true,
      players: ['player-without-stats'],
      playersWithStats: [PLAYER_ID],
    });

    await service.inicializar();

    expect(market.listarIdsJugadoresConEstadisticas).toHaveBeenCalledTimes(1);
    expect(market.listarIdsJugadores).not.toHaveBeenCalled();
    expect(transaction.insertarTokens.mock.calls[0][0]).toHaveLength(100);
    expect(transaction.insertarTokens.mock.calls[0][0][0].jugadorId).toBe(PLAYER_ID);
  });
});
