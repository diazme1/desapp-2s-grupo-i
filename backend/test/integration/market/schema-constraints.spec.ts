import { randomUUID } from 'node:crypto';
import { MarketInitializationService } from '../../../src/market/market-initialization.service';
import { TokenJugadorEntity } from '../../../src/market/persistence/token-jugador.entity';
import {
  createPlayersIntegrationApp,
  PlayersIntegrationApp,
} from '../players/players-integration-app';

describe('restricciones de integridad del mercado', () => {
  let integration: PlayersIntegrationApp;
  const playerId = 'd4fd866a-1c58-4423-99eb-56e70d745401';
  const leagueId = '2c2eb773-a1d7-4fa8-863e-3df115ce0401';
  const teamId = '6c0fe8a3-91f4-40a2-a836-8329a3b0f401';

  beforeAll(async () => {
    integration = await createPlayersIntegrationApp(
      { obtenerCatalogo: jest.fn() },
      { superadmin: { email: 'schema-admin@example.com', password: 'secret123' } },
    );
    const now = new Date('2026-01-01T00:00:00.000Z');
    await integration.dataSource.query(
      `INSERT INTO ligas (id, proveedor_id, codigo, nombre, creado_en, actualizado_en)
       VALUES ($1, 9941, 'SCHEMA', 'Schema League', $2, $2)`,
      [leagueId, now],
    );
    await integration.dataSource.query(
      `INSERT INTO equipos (id, proveedor_id, liga_id, nombre, creado_en, actualizado_en)
       VALUES ($1, 9942, $2, 'Schema FC', $3, $3)`,
      [teamId, leagueId, now],
    );
    await integration.dataSource.query(
      `INSERT INTO jugadores (id, proveedor_id, equipo_id, nombre, creado_en, actualizado_en)
       VALUES ($1, 9943, $2, 'Schema Player', $3, $3)`,
      [playerId, teamId, now],
    );
    await integration.app.get(MarketInitializationService).inicializar();
  });

  afterAll(async () => integration?.close());

  it('rechaza una emisión duplicada por número de jugador', async () => {
    const token = await integration.dataSource
      .getRepository(TokenJugadorEntity)
      .findOneByOrFail({ jugadorId: playerId, numeroEmision: 1 });
    await expect(
      integration.dataSource.getRepository(TokenJugadorEntity).insert({
        idToken: randomUUID(),
        jugadorId: playerId,
        usuarioOwnerId: token.usuarioOwnerId,
        numeroEmision: 1,
        loteEmisionId: token.loteEmisionId,
        emitidoEn: new Date(),
        actualizadoEn: new Date(),
      }),
    ).rejects.toMatchObject({ code: '23505' });
  });

  it('mantiene los límites SQL de cantidad y emisión', async () => {
    await expect(
      integration.dataSource.query(
        'UPDATE tokens SET numero_emision = 101 WHERE id_jugador = $1 AND numero_emision = 1',
        [playerId],
      ),
    ).rejects.toMatchObject({ code: '23514' });
  });
});
