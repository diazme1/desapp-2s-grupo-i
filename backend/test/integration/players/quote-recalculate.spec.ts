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
const JUGADOR_SIN_STATS_ID = 'b1b461dd-b3fb-4dc4-b0ad-e2d7adf2a9a8';
const STATS_ANTERIORES_ID = 'd1b461dd-b3fb-4dc4-b0ad-e2d7adf2a9a8';
const STATS_RECIENTES_ID = 'e1b461dd-b3fb-4dc4-b0ad-e2d7adf2a9a8';

describe('POST /quotes/recalculate', () => {
  let integration: PlayersIntegrationApp;
  let adminToken: string;

  beforeAll(async () => {
    integration = await createPlayersIntegrationApp({
      obtenerCatalogo: jest.fn(),
    } as jest.Mocked<FootballDataPort>);
  });

  beforeEach(async () => {
    await integration.resetData();
    await sembrarJugadores(integration);
    await sembrarEstadisticas(integration);
    adminToken = integration.app
      .get(JwtTokenService)
      .sign({
        sub: '00000000-0000-4000-8000-000000000001',
        correo: 'superadmin@example.com',
        rol: UserRole.SUPERADMIN,
      });
  });

  afterAll(async () => integration?.close());

  it('requiere autenticación y rechaza a usuarios comunes', async () => {
    const app = integration.app.getHttpServer();
    await request(app)
      .post('/quotes/recalculate')
      .send({ estrategia: 'ataque_decisivo' })
      .expect(401);

    await request(app)
      .post('/auth/register')
      .send({ correo: 'usuario@example.com', password: 'secret123' })
      .expect(201);
    const login = await request(app)
      .post('/auth/login')
      .send({ correo: 'usuario@example.com', password: 'secret123' })
      .expect(200);

    await request(app)
      .post('/quotes/recalculate')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ estrategia: 'ataque_decisivo' })
      .expect(403);
  });

  it('guarda ambas estrategias con la última estadística y activa la elegida', async () => {
    const app = integration.app.getHttpServer();
    const response = await request(app)
      .post('/quotes/recalculate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ estrategia: 'ataque_decisivo' })
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        estrategia: 'ataque_decisivo',
        estrategiasCalculadas: ['ataque_decisivo', 'creacion_tecnica'],
        versionEstrategia: 1,
        jugadoresCotizados: 1,
        jugadoresSinEstadisticas: 1,
      }),
    );
    const historial = (await integration.dataSource.query(
      `SELECT id_estadistica AS "idEstadistica", cotizacion,
              tipo_estrategia AS estrategia
       FROM historial_cotizacion ORDER BY tipo_estrategia`,
    )) as Array<{
      idEstadistica: string;
      cotizacion: string;
      estrategia: string;
    }>;
    expect(historial).toHaveLength(2);
    expect(historial).toEqual([
      {
        idEstadistica: STATS_RECIENTES_ID,
        cotizacion: '6.58',
        estrategia: 'ataque_decisivo',
      },
      {
        idEstadistica: STATS_RECIENTES_ID,
        cotizacion: '3.98',
        estrategia: 'creacion_tecnica',
      },
    ]);

    const activo = (await integration.dataSource.query(
      'SELECT id_recalculo, tipo_estrategia FROM recalculo_cotizacion_activo WHERE id = 1',
    )) as Array<{ id_recalculo: string; tipo_estrategia: string }>;
    expect(activo[0].id_recalculo).toBe(response.body.idRecalculo);
    expect(activo[0].tipo_estrategia).toBe('ataque_decisivo');
    expect(integration.source.obtenerCatalogo).not.toHaveBeenCalled();
  });

  it('conserva la corrida activa y el historial si falla una inserción', async () => {
    const app = integration.app.getHttpServer();
    const primera = await request(app)
      .post('/quotes/recalculate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ estrategia: 'ataque_decisivo' })
      .expect(200);

    await integration.dataSource.query(`
      CREATE FUNCTION rechazar_cotizacion_de_prueba() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'fallo simulado';
      END;
      $$ LANGUAGE plpgsql
    `);
    await integration.dataSource.query(`
      CREATE TRIGGER trg_rechazar_cotizacion_de_prueba
      BEFORE INSERT ON historial_cotizacion
      FOR EACH ROW WHEN (NEW.tipo_estrategia = 'creacion_tecnica')
      EXECUTE FUNCTION rechazar_cotizacion_de_prueba()
    `);

    try {
      await request(app)
        .post('/quotes/recalculate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ estrategia: 'creacion_tecnica' })
        .expect(500);
    } finally {
      await integration.dataSource.query(
        'DROP TRIGGER IF EXISTS trg_rechazar_cotizacion_de_prueba ON historial_cotizacion',
      );
      await integration.dataSource.query(
        'DROP FUNCTION IF EXISTS rechazar_cotizacion_de_prueba()',
      );
    }

    const activo = (await integration.dataSource.query(
      'SELECT id_recalculo FROM recalculo_cotizacion_activo WHERE id = 1',
    )) as Array<{ id_recalculo: string }>;
    const historial = (await integration.dataSource.query(
      'SELECT id FROM historial_cotizacion',
    )) as unknown[];
    const versiones = (await integration.dataSource.query(
      'SELECT id FROM versiones_estrategia_cotizacion',
    )) as unknown[];
    expect(activo[0].id_recalculo).toBe(primera.body.idRecalculo);
    expect(historial).toHaveLength(2);
    expect(versiones).toHaveLength(2);
  });

  it('rechaza una estrategia inválida', async () => {
    await request(integration.app.getHttpServer())
      .post('/quotes/recalculate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ estrategia: 'defensa_total' })
      .expect(422);
  });
});

async function sembrarJugadores(integration: PlayersIntegrationApp): Promise<void> {
  await integration.dataSource.query(
    'INSERT INTO ligas (id, proveedor_id, codigo, nombre) VALUES ($1, $2, $3, $4)',
    [LIGA_ID, 2021, 'PL', 'Premier League'],
  );
  await integration.dataSource.query(
    'INSERT INTO equipos (id, proveedor_id, liga_id, nombre) VALUES ($1, $2, $3, $4)',
    [EQUIPO_ID, 65, LIGA_ID, 'Manchester City FC'],
  );
  await integration.dataSource.query(
    `INSERT INTO jugadores (id, proveedor_id, equipo_id, nombre)
     VALUES ($1, $2, $3, $4), ($5, $6, $3, $7)`,
    [
      JUGADOR_ID,
      44,
      EQUIPO_ID,
      'Jugador Con Estadisticas',
      JUGADOR_SIN_STATS_ID,
      45,
      'Jugador Sin Estadisticas',
    ],
  );
}

async function sembrarEstadisticas(
  integration: PlayersIntegrationApp,
): Promise<void> {
  await integration.dataSource.query(
    `INSERT INTO estadisticas_jugadores
      (id, id_jugador, goles, asistencias, tiros, pases_clave, regates,
       faltas_cometidas, rating_whoscored, fecha_captura)
     VALUES ($1, $2, 99, 0, 0, 0, 0, 0, 0, $3),
            ($4, $2, 10, 5, 2, 1, 1, 1, 7.5, $5)`,
    [
      STATS_ANTERIORES_ID,
      JUGADOR_ID,
      new Date('2026-01-01T00:00:00Z'),
      STATS_RECIENTES_ID,
      new Date('2026-03-01T00:00:00Z'),
    ],
  );
}
