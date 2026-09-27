import request from 'supertest';
import { Equipo } from '../../../src/players/domain/equipo';
import { Jugador } from '../../../src/players/domain/jugador';
import { Liga } from '../../../src/players/domain/liga';
import { CatalogoBase } from '../../../src/players/players.repository';
import {
  createPlayersIntegrationApp,
  PlayersIntegrationApp,
} from './players-integration-app';

function catalogo(version: number): CatalogoBase {
  const liga = Liga.crear({
    id: '3f1f8e5f-e2b9-4f4a-9d25-06c248d78e5b',
    proveedorId: 2021,
    codigo: 'PL',
    nombre: 'Premier League',
  });
  const equipo = Equipo.crear({
    id: 'd21b7e37-50a7-4da6-bfcb-4f4ecb7b7b99',
    proveedorId: 65,
    ligaId: liga.id,
    nombre: version === 1 ? 'Manchester City FC' : 'Manchester City',
  });
  const jugador = Jugador.crear({
    id: version === 1 ? '8f4cf5a8-5b15-4d07-8f89-ecbdeec1f0fc' : 'f1b461dd-b3fb-4dc4-b0ad-e2d7adf2a9a8',
    proveedorId: 44,
    equipoId: equipo.id,
    nombre: version === 1 ? 'Cristiano Ronaldo' : 'Cristiano Ronaldo actualizado',
  });
  return { ligas: [liga], equipos: [equipo], jugadores: [jugador] };
}

describe('Catálogo base de jugadores', () => {
  let integration: PlayersIntegrationApp;

  beforeAll(async () => {
    const source = { obtenerCatalogo: jest.fn() };
    integration = await createPlayersIntegrationApp(source);
  });

  beforeEach(async () => {
    await integration.resetData();
    integration.source.obtenerCatalogo.mockReset().mockResolvedValue(catalogo(1));
  });

  afterAll(async () => integration?.close());

  it('protege la actualización y guarda/upsertea manteniendo el id interno', async () => {
    const app = integration.app.getHttpServer();
    integration.source.obtenerCatalogo.mockResolvedValueOnce(catalogo(1)).mockResolvedValueOnce(catalogo(2));
    await request(app).post('/catalog/refresh').expect(401);
    await request(app)
      .post('/auth/register')
      .send({ correo: 'catalogo@example.com', password: 'secret123' })
      .expect(201);
    const login = await request(app)
      .post('/auth/login')
      .send({ correo: 'catalogo@example.com', password: 'secret123' })
      .expect(200);

    await request(app)
      .post('/catalog/refresh')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200)
      .expect(({ body }) => expect(body).toMatchObject({ ligas: 1, equipos: 1, jugadores: 1 }));
    const first = await request(app).get('/players').expect(200);
    expect(first.body).toHaveLength(1);
    const internalId = first.body[0].id;

    await request(app)
      .post('/catalog/refresh')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);
    const second = await request(app).get('/players?ligaCodigo=pl').expect(200);
    expect(second.body[0].id).toBe(internalId);
    expect(second.body[0].nombre).toBe('Cristiano Ronaldo actualizado');
    expect(integration.source.obtenerCatalogo).toHaveBeenCalledTimes(2);
  });

  it('resuelve listado y detalle desde PostgreSQL y devuelve 404 para un id ausente', async () => {
    const app = integration.app.getHttpServer();
    integration.source.obtenerCatalogo.mockResolvedValue(catalogo(1));
    const register = await request(app)
      .post('/auth/register')
      .send({ correo: 'catalogo-read@example.com', password: 'secret123' })
      .expect(201);
    expect(register.body.password).toBeUndefined();

    const login = await request(app)
      .post('/auth/login')
      .send({ correo: 'catalogo-read@example.com', password: 'secret123' })
      .expect(200);
    await request(app)
      .post('/catalog/refresh')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);

    const list = await request(app).get('/players').expect(200);
    await request(app).get(`/players/${list.body[0].id}`).expect(200);
    await request(app).get('/players/00000000-0000-4000-8000-000000000000').expect(404);
  });
});
