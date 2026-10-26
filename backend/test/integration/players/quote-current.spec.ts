import request from 'supertest';
import type { FootballDataPort } from '../../../src/players/adapters/football-data/football-data.adapter';
import { JwtTokenService } from '../../../src/auth/strategies/jwt-token.service';
import { UserRole } from '../../../src/users/domain/user';
import {
  createPlayersIntegrationApp,
  type PlayersIntegrationApp,
} from './players-integration-app';

const LIGA_ID = '3f1f8e5f-e2b9-4f4a-9d25-06c248d78e5b';
const EQUIPO_ID = 'd21b7e37-50a7-4da6-bfcb-4f4ecb7b7b99';
const JUGADOR_ID = '8f4cf5a8-5b15-4d07-8f89-ecbdeec1f0fc';
const STATS_ID = 'e1b461dd-b3fb-4dc4-b0ad-e2d7adf2a9a8';

describe('cotizacion_vigente', () => {
  let integration: PlayersIntegrationApp;
  let adminToken: string;

  beforeAll(async () => {
    integration = await createPlayersIntegrationApp({
      obtenerCatalogo: jest.fn(),
    } as jest.Mocked<FootballDataPort>);
  });

  beforeEach(async () => {
    await integration.resetData();
    await sembrarJugadorYEstadisticas(integration);
    adminToken = integration.app.get(JwtTokenService).sign({
      sub: '00000000-0000-4000-8000-000000000001',
      correo: 'superadmin@example.com',
      rol: UserRole.SUPERADMIN,
    });
  });

  afterAll(async () => integration?.close());

  it('guarda ambas cotizaciones vigentes y permite cambiar el ranking por GET', async () => {
    const app = integration.app.getHttpServer();
    const primera = await recalcular(app, adminToken, 'ataque_decisivo');
    const rankingActivo = await request(app).get('/players/ranking').expect(200);
    expect(rankingActivo.body).toEqual(
      expect.objectContaining({
        estrategia: 'ataque_decisivo',
        idRecalculo: primera.idRecalculo,
        jugadores: [expect.objectContaining({ cotizacion: 6.58 })],
      }),
    );
    const rankingAlternativo = await request(app)
      .get('/players/ranking?estrategia=creacion_tecnica')
      .expect(200);
    expect(rankingAlternativo.body).toEqual(
      expect.objectContaining({
        estrategia: 'creacion_tecnica',
        jugadores: [expect.objectContaining({ cotizacion: 3.98 })],
      }),
    );

    const segunda = await recalcular(app, adminToken, 'creacion_tecnica');

    const vigente = (await integration.dataSource.query(
      `SELECT id_jugador AS "idJugador", cotizacion, tipo_estrategia AS estrategia,
              id_recalculo AS "idRecalculo", id_estadistica AS "idEstadistica"
       FROM cotizacion_vigente ORDER BY tipo_estrategia`,
    )) as Array<{
      idJugador: string;
      cotizacion: string;
      estrategia: string;
      idRecalculo: string;
      idEstadistica: string;
    }>;
    const historial = (await integration.dataSource.query(
      'SELECT id FROM historial_cotizacion',
    )) as unknown[];

    expect(vigente).toHaveLength(2);
    expect(vigente).toEqual([
      {
        idJugador: JUGADOR_ID,
        cotizacion: '6.58',
        estrategia: 'ataque_decisivo',
        idRecalculo: expect.any(String),
        idEstadistica: STATS_ID,
      },
      {
        idJugador: JUGADOR_ID,
        cotizacion: '3.98',
        estrategia: 'creacion_tecnica',
        idRecalculo: segunda.idRecalculo,
        idEstadistica: STATS_ID,
      },
    ]);
    expect(historial).toHaveLength(4);
    const rankingLuegoDeElegir = await request(app).get('/players/ranking').expect(200);
    expect(rankingLuegoDeElegir.body.estrategia).toBe('creacion_tecnica');
  });

  it('revierte historial y cotización vigente si falla el upsert', async () => {
    const app = integration.app.getHttpServer();
    const primera = await recalcular(app, adminToken, 'ataque_decisivo');
    await integration.dataSource.query(`
      CREATE FUNCTION rechazar_actualizacion_vigente_de_prueba() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'fallo simulado';
      END;
      $$ LANGUAGE plpgsql
    `);
    await integration.dataSource.query(`
      CREATE TRIGGER trg_rechazar_actualizacion_vigente_de_prueba
      BEFORE UPDATE ON cotizacion_vigente
      FOR EACH ROW WHEN (NEW.tipo_estrategia = 'creacion_tecnica')
      EXECUTE FUNCTION rechazar_actualizacion_vigente_de_prueba()
    `);

    try {
      await request(app)
        .post('/quotes/recalculate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ estrategia: 'creacion_tecnica' })
        .expect(500);
    } finally {
      await integration.dataSource.query(
        'DROP TRIGGER IF EXISTS trg_rechazar_actualizacion_vigente_de_prueba ON cotizacion_vigente',
      );
      await integration.dataSource.query(
        'DROP FUNCTION IF EXISTS rechazar_actualizacion_vigente_de_prueba()',
      );
    }

    const activo = (await integration.dataSource.query(
      'SELECT id_recalculo, tipo_estrategia FROM recalculo_cotizacion_activo WHERE id = 1',
    )) as Array<{ id_recalculo: string; tipo_estrategia: string }>;
    const historial = (await integration.dataSource.query(
      'SELECT id FROM historial_cotizacion',
    )) as unknown[];
    const vigente = (await integration.dataSource.query(
      'SELECT cotizacion, tipo_estrategia FROM cotizacion_vigente',
    )) as Array<{ cotizacion: string; tipo_estrategia: string }>;

    expect(activo[0].id_recalculo).toBe(primera.idRecalculo);
    expect(activo[0].tipo_estrategia).toBe('ataque_decisivo');
    expect(historial).toHaveLength(2);
    expect(vigente).toEqual([
      { cotizacion: '6.58', tipo_estrategia: 'ataque_decisivo' },
      { cotizacion: '3.98', tipo_estrategia: 'creacion_tecnica' },
    ]);
  });
});

async function recalcular(
  app: ReturnType<PlayersIntegrationApp['app']['getHttpServer']>,
  token: string,
  estrategia: 'ataque_decisivo' | 'creacion_tecnica',
): Promise<{ idRecalculo: string }> {
  const response = await request(app)
    .post('/quotes/recalculate')
    .set('Authorization', `Bearer ${token}`)
    .send({ estrategia })
    .expect(200);
  return response.body as { idRecalculo: string };
}

async function sembrarJugadorYEstadisticas(
  integration: PlayersIntegrationApp,
): Promise<void> {
  await integration.dataSource.query(
    'INSERT INTO ligas (id, proveedor_id, codigo, nombre) VALUES ($1, $2, $3, $4)',
    [LIGA_ID, 2021, 'PL', 'Premier League'],
  );
  await integration.dataSource.query(
    'INSERT INTO equipos (id, proveedor_id, liga_id, nombre) VALUES ($1, $2, $3, $4)',
    [EQUIPO_ID, 65, LIGA_ID, 'Manchester City FC'],
  );
  await integration.dataSource.query(
    'INSERT INTO jugadores (id, proveedor_id, equipo_id, nombre) VALUES ($1, $2, $3, $4)',
    [JUGADOR_ID, 44, EQUIPO_ID, 'Jugador Con Estadisticas'],
  );
  await integration.dataSource.query(
    `INSERT INTO estadisticas_jugadores
      (id, id_jugador, goles, asistencias, tiros, pases_clave, regates,
       faltas_cometidas, rating_whoscored, fecha_captura)
     VALUES ($1, $2, 10, 5, 2, 1, 1, 1, 7.5, $3)`,
    [STATS_ID, JUGADOR_ID, new Date('2026-03-01T00:00:00Z')],
  );
}
