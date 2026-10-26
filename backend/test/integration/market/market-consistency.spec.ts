import { MarketInitializationService } from '../../../src/market/market-initialization.service';
import {
  createPlayersIntegrationApp,
  PlayersIntegrationApp,
} from '../players/players-integration-app';

describe('consistencia persistida de tokens y tenencias', () => {
  let integration: PlayersIntegrationApp;
  const playerId = 'd4fd866a-1c58-4423-99eb-56e70d745501';
  const userEmail = 'consistency-admin@example.com';

  beforeAll(async () => {
    integration = await createPlayersIntegrationApp(
      { obtenerCatalogo: jest.fn() },
      { superadmin: { email: userEmail, password: 'secret123' } },
    );
    const now = new Date('2026-01-01T00:00:00.000Z');
    await integration.dataSource.query(
      `INSERT INTO ligas (id, proveedor_id, codigo, nombre, creado_en, actualizado_en)
       VALUES ($1, 9951, 'CONS', 'Consistency League', $2, $2)`,
      ['2c2eb773-a1d7-4fa8-863e-3df115ce0501', now],
    );
    await integration.dataSource.query(
      `INSERT INTO equipos (id, proveedor_id, liga_id, nombre, creado_en, actualizado_en)
       VALUES ($1, 9952, $2, 'Consistency FC', $3, $3)`,
      ['6c0fe8a3-91f4-40a2-a836-8329a3b0f501', '2c2eb773-a1d7-4fa8-863e-3df115ce0501', now],
    );
    await integration.dataSource.query(
      `INSERT INTO jugadores (id, proveedor_id, equipo_id, nombre, creado_en, actualizado_en)
       VALUES ($1, 9953, $2, 'Consistency Player', $3, $3)`,
      [playerId, '6c0fe8a3-91f4-40a2-a836-8329a3b0f501', now],
    );
    await integration.app.get(MarketInitializationService).inicializar();
  });

  afterAll(async () => integration?.close());

  it('iguala las cantidades agregadas con los propietarios actuales', async () => {
    const rows = await integration.dataSource.query(
      `SELECT t.id_usuario_owner, COUNT(*)::integer AS cantidad,
              h.cantidad_tokens
       FROM tokens t
       JOIN tenencias_jugador h
         ON h.id_usuario = t.id_usuario_owner AND h.id_jugador = t.id_jugador
       WHERE t.id_jugador = $1
       GROUP BY t.id_usuario_owner, h.cantidad_tokens`,
      [playerId],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].cantidad).toBe(rows[0].cantidad_tokens);
    expect(await integration.dataSource.query("SELECT to_regclass('transacciones') AS table_name")).toEqual([{ table_name: null }]);
  });
});
