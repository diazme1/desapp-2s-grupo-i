import request from 'supertest';
import { CATALOG_REFRESH_TEST_API_KEY, createIntegrationApp, IntegrationApp } from '../helpers/integration-app';

describe('alcance de X-API-Key', () => {
  let integration: IntegrationApp;

  beforeAll(async () => {
    integration = await createIntegrationApp();
  });

  afterEach(async () => integration?.resetData());
  afterAll(async () => integration?.close());

  it('mantiene health público sin API key', async () => {
    await request(integration.app.getHttpServer()).get('/health').expect(200);
  });

  it('mantiene GET /auth/me con Bearer sin API key', async () => {
    const app = integration.app.getHttpServer();
    await request(app)
      .post('/auth/register')
      .send({ correo: 'scope@example.com', password: 'secret123' })
      .expect(201);
    const token = (
      await request(app)
        .post('/auth/login')
        .send({ correo: 'scope@example.com', password: 'secret123' })
        .expect(200)
    ).body.accessToken as string;

    const response = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.correo).toBe('scope@example.com');
    expect(response.headers['x-api-key']).toBeUndefined();
  });

  it('mantiene las lecturas del catálogo sin API key', async () => {
    const response = await request(integration.app.getHttpServer()).get('/players').expect(200);

    expect(response.body).toEqual([]);
    expect(response.headers['x-api-key']).toBeUndefined();
    expect(CATALOG_REFRESH_TEST_API_KEY).toBeTruthy();
  });
});
