import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createIntegrationApp, IntegrationApp } from '../helpers/integration-app';

describe('Consistencia del catalogo de jugadores', () => {
  let app: INestApplication;
  let integration: IntegrationApp;

  beforeAll(async () => {
    integration = await createIntegrationApp();
    app = integration.app;
  });

  afterEach(async () => {
    if (integration?.database?.isInitialized) {
      await integration.database.query('TRUNCATE TABLE identidades_externas_jugador');
      await integration.resetData();
    }
  });
  afterAll(async () => integration?.close());

  it('impide duplicar proveedor y externalId', async () => {
    await integration.database.query(`
      INSERT INTO identidades_externas_jugador
        (id, jugador_id, proveedor, external_id)
      VALUES
        ('40000000-0000-4000-8000-000000000001',
         '30000000-0000-4000-8000-000000000001', 'whoscored', 'player-1')
    `);

    await expect(
      integration.database.query(`
        INSERT INTO identidades_externas_jugador
          (id, jugador_id, proveedor, external_id)
        VALUES
          ('40000000-0000-4000-8000-000000000002',
           '30000000-0000-4000-8000-000000000002', 'whoscored', 'player-1')
      `),
    ).rejects.toMatchObject({ code: '23505' });
  });

  it('impide asociar un jugador a un equipo de otra liga', async () => {
    await expect(
      integration.database.query(`
        INSERT INTO jugadores
          (id, liga_id, equipo_id, nombre, posicion, activo, actualizado_en)
        VALUES
          ('30000000-0000-4000-8000-000000000099',
           '10000000-0000-4000-8000-000000000001',
           '20000000-0000-4000-8000-000000000002',
           'Jugador inconsistente', 'defensa', true, now())
      `),
    ).rejects.toMatchObject({ code: '23503' });
  });

  it('continua leyendo datos locales sin consultar ningun proveedor', async () => {
    const response = await request(app.getHttpServer()).get('/players').expect(200);
    expect(response.body.total).toBe(5);
  });
});
