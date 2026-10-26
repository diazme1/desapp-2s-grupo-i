import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { MarketInitializationService } from '../../../src/market/market-initialization.service';
import { EquipoEntity } from '../../../src/players/persistence/equipo.entity';
import { JugadorEntity } from '../../../src/players/persistence/jugador.entity';
import { LigaEntity } from '../../../src/players/persistence/liga.entity';
import { HistorialCotizacionEntity } from '../../../src/players/persistence/historial-cotizacion.entity';
import { TokenJugadorEntity } from '../../../src/market/persistence/token-jugador.entity';
import { TenenciaJugadorEntity } from '../../../src/market/persistence/tenencia-jugador.entity';
import {
  createPlayersIntegrationApp,
  PlayersIntegrationApp,
} from '../players/players-integration-app';

const SUPERADMIN = { email: 'market-admin@example.com', password: 'secret123' };
const LEAGUE_ID = '2c2eb773-a1d7-4fa8-863e-3df115ce0101';
const TEAM_ID = '6c0fe8a3-91f4-40a2-a836-8329a3b0f101';
const PLAYER_ID = 'd4fd866a-1c58-4423-99eb-56e70d745101';
const SECOND_PLAYER_ID = 'd4fd866a-1c58-4423-99eb-56e70d745102';

describe('MarketInitializationService', () => {
  let integration: PlayersIntegrationApp;

  beforeAll(async () => {
    integration = await createPlayersIntegrationApp(
      { obtenerCatalogo: jest.fn() },
      { superadmin: SUPERADMIN },
    );
  });

  beforeEach(async () => {
    await integration.resetData();
  });

  afterAll(async () => integration?.close());

  it('termina correctamente con catálogo vacío y no deja datos parciales', async () => {
    await integration.app.get(MarketInitializationService).inicializar();

    const counts = await integration.dataSource.query(`
      SELECT
        (SELECT COUNT(*) FROM tokens) AS tokens,
        (SELECT COUNT(*) FROM tenencias_jugador) AS tenencias,
        (SELECT COUNT(*) FROM historial_cotizacion WHERE tipo_estrategia = 'apertura_mercado') AS aperturas
    `);
    expect(counts[0]).toEqual({ tokens: '0', tenencias: '0', aperturas: '0' });
  });

  it('emite exactamente 100 tokens, una tenencia y una apertura exacta por jugador', async () => {
    await insertPlayer(integration, PLAYER_ID, 'Jugador Inicial');
    await integration.app.get(MarketInitializationService).inicializar();

    const counts = await integration.dataSource.query(
      `SELECT COUNT(*) AS total FROM tokens WHERE id_jugador = $1`,
      [PLAYER_ID],
    );
    const opening = await integration.dataSource.query(
      `SELECT cotizacion::text AS cotizacion, id_recalculo, id_estadistica
       FROM historial_cotizacion
       WHERE id_jugador = $1 AND tipo_estrategia = 'apertura_mercado'`,
      [PLAYER_ID],
    );
    const holding = await integration.dataSource.query(
      `SELECT cantidad_tokens FROM tenencias_jugador WHERE id_jugador = $1`,
      [PLAYER_ID],
    );

    expect(counts[0].total).toBe('100');
    expect(holding).toEqual([{ cantidad_tokens: 100 }]);
    expect(opening).toEqual([{ cotizacion: '1.00', id_recalculo: null, id_estadistica: null }]);
  });

  it('es idempotente, soporta concurrencia y preserva propietarios existentes', async () => {
    await insertPlayer(integration, PLAYER_ID, 'Jugador Concurrente');
    const service = integration.app.get(MarketInitializationService);
    await service.inicializar();
    const secondUser = await request(integration.app.getHttpServer())
      .post('/auth/register')
      .send({ correo: 'buyer@example.com', password: 'secret123' })
      .expect(201);
    const tokenRepository = integration.dataSource.getRepository(TokenJugadorEntity);
    const token = await tokenRepository.findOneByOrFail({ jugadorId: PLAYER_ID, numeroEmision: 1 });
    token.usuarioOwnerId = secondUser.body.id;
    token.actualizadoEn = new Date();
    await tokenRepository.save(token);
    const holdingRepository = integration.dataSource.getRepository(TenenciaJugadorEntity);
    const initialHolding = await holdingRepository.findOneByOrFail({ jugadorId: PLAYER_ID });
    initialHolding.cantidadTokens = 99;
    await holdingRepository.save(initialHolding);
    await holdingRepository.save({
      id: randomUUID(),
      usuarioId: secondUser.body.id,
      jugadorId: PLAYER_ID,
      cantidadTokens: 1,
      creadoEn: new Date(),
      actualizadoEn: new Date(),
    });

    await Promise.all([service.inicializar(), service.inicializar()]);

    const persistedToken = await tokenRepository.findOneByOrFail({ jugadorId: PLAYER_ID, numeroEmision: 1 });
    expect(persistedToken.usuarioOwnerId).toBe(secondUser.body.id);
    expect(await holdingRepository.countBy({ jugadorId: PLAYER_ID })).toBe(2);
    expect(await integration.dataSource.getRepository(HistorialCotizacionEntity).count({ where: { jugador: { id: PLAYER_ID }, tipoEstrategia: 'apertura_mercado' } })).toBe(1);
  });

  it('rechaza una emisión parcial y conserva el estado parcial sin completar silenciosamente', async () => {
    await insertPlayer(integration, PLAYER_ID, 'Jugador Parcial');
    const service = integration.app.get(MarketInitializationService);
    await service.inicializar();
    await integration.dataSource.getRepository(TokenJugadorEntity).delete({ jugadorId: PLAYER_ID, numeroEmision: 100 });

    await expect(service.inicializar()).rejects.toThrow('incompleta');
    expect(await integration.dataSource.getRepository(TokenJugadorEntity).countBy({ jugadorId: PLAYER_ID })).toBe(99);
  });

  it('inicializa jugadores agregados después de la primera corrida', async () => {
    await insertPlayer(integration, PLAYER_ID, 'Jugador Uno');
    const service = integration.app.get(MarketInitializationService);
    await service.inicializar();
    await insertPlayer(integration, SECOND_PLAYER_ID, 'Jugador Dos');
    await service.inicializar();

    expect(await integration.dataSource.getRepository(TokenJugadorEntity).count()).toBe(200);
    expect(await integration.dataSource.getRepository(TenenciaJugadorEntity).count()).toBe(2);
  });
});

async function insertPlayer(
  integration: PlayersIntegrationApp,
  id: string,
  nombre: string,
): Promise<void> {
  const now = new Date('2026-01-01T00:00:00.000Z');
  const leagueRepository = integration.dataSource.getRepository(LigaEntity);
  const teamRepository = integration.dataSource.getRepository(EquipoEntity);
  const playerRepository = integration.dataSource.getRepository(JugadorEntity);
  if (!(await leagueRepository.findOneBy({ id: LEAGUE_ID }))) {
    await leagueRepository.save({
      id: LEAGUE_ID,
      proveedorId: 9901,
      codigo: 'MK',
      nombre: 'Market League',
      pais: null,
      emblemaUrl: null,
      creadoEn: now,
      actualizadoEn: now,
    });
  }
  if (!(await teamRepository.findOneBy({ id: TEAM_ID }))) {
    await teamRepository.save({
      id: TEAM_ID,
      proveedorId: 9902,
      nombre: 'Market FC',
      nombreCorto: null,
      sigla: null,
      escudoUrl: null,
      liga: { id: LEAGUE_ID },
      creadoEn: now,
      actualizadoEn: now,
    });
  }
  await playerRepository.save({
    id,
    proveedorId: id === PLAYER_ID ? 9903 : 9904,
    nombre,
    nombreCompleto: null,
    posicion: null,
    fechaNacimiento: null,
    nacionalidad: null,
    equipo: { id: TEAM_ID },
    creadoEn: now,
    actualizadoEn: now,
  });
}
