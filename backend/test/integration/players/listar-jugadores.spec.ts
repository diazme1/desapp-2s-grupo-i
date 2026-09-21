import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createIntegrationApp, IntegrationApp } from '../helpers/integration-app';

describe('GET /players', () => {
  let app: INestApplication;
  let integration: IntegrationApp;

  beforeAll(async () => {
    integration = await createIntegrationApp();
    app = integration.app;
  });

  afterEach(async () => integration?.resetData());
  afterAll(async () => integration?.close());

  it('lista los jugadores activos de las cinco ligas', async () => {
    const response = await request(app.getHttpServer()).get('/players').expect(200);

    expect(response.body.total).toBe(5);
    expect(response.body.items).toHaveLength(5);
    expect(response.body.items.every((item: { activo: boolean }) => item.activo)).toBe(true);
    expect(response.body.items[0]).not.toHaveProperty('externalId');
  });

  it('filtra por liga, equipo, posicion y combina filtros con AND', async () => {
    await request(app.getHttpServer())
      .get('/players?liga=PREMIER-LEAGUE&posicion=EXTREMO')
      .expect(200)
      .expect((response) => {
        expect(response.body.total).toBe(1);
        expect(response.body.items[0].liga.codigo).toBe('premier-league');
        expect(response.body.items[0].equipo.nombre).toBe('Arsenal');
      });

    await request(app.getHttpServer())
      .get('/players?equipo=Arsenal')
      .expect(200)
      .expect((response) => expect(response.body.total).toBe(1));
  });

  it('devuelve una coleccion vacia si no hay coincidencias', async () => {
    const response = await request(app.getHttpServer())
      .get('/players?liga=serie-a&posicion=arquero')
      .expect(200);

    expect(response.body).toEqual({ items: [], total: 0 });
  });

  it('rechaza filtros vacios o demasiado largos con 400', async () => {
    await request(app.getHttpServer()).get('/players?posicion=').expect(400);
    await request(app.getHttpServer()).get(`/players?posicion=${'a'.repeat(101)}`).expect(400);
  });
});
