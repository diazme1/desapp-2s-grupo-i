import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createIntegrationApp, IntegrationApp } from '../helpers/integration-app';

describe('GET /players/:id', () => {
  let app: INestApplication;
  let integration: IntegrationApp;

  beforeAll(async () => {
    integration = await createIntegrationApp();
    app = integration.app;
  });

  afterEach(async () => integration?.resetData());
  afterAll(async () => integration?.close());

  it('devuelve el detalle de un jugador activo', async () => {
    const response = await request(app.getHttpServer())
      .get('/players/30000000-0000-4000-8000-000000000001')
      .expect(200);

    expect(response.body).toMatchObject({
      id: '30000000-0000-4000-8000-000000000001',
      nombre: 'Bukayo Saka',
      equipo: { nombre: 'Arsenal' },
      liga: { codigo: 'premier-league' },
    });
    expect(response.body.externalId).toBeUndefined();
  });

  it('devuelve 404 para un jugador inexistente', async () => {
    const response = await request(app.getHttpServer())
      .get('/players/30000000-0000-4000-8000-000000000099')
      .expect(404);

    expect(response.body.statusCode).toBe(404);
    expect(response.body.message).toContain('jugador');
  });

  it('devuelve 400 para un identificador invalido', async () => {
    const response = await request(app.getHttpServer()).get('/players/no-es-un-uuid').expect(400);

    expect(response.body.statusCode).toBe(400);
    expect(response.body.message).toBeTruthy();
  });
});
