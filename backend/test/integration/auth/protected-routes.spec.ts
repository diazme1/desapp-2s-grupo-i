import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { createIntegrationApp, IntegrationApp } from '../helpers/integration-app';

describe('rutas protegidas', () => {
  let app: INestApplication;
  let integration: IntegrationApp;
  let token = '';
  beforeAll(async () => {
    integration = await createIntegrationApp();
    app = integration.app;
  });
  beforeEach(async () => {
    await request(app.getHttpServer()).post('/auth/register').send({ correo: 'me@example.com', password: 'secret123' }).expect(201);
    token = (await request(app.getHttpServer()).post('/auth/login').send({ correo: 'me@example.com', password: 'secret123' }).expect(200)).body.accessToken;
  });
  afterEach(async () => integration?.resetData());
  afterAll(async () => integration?.close());

  it('mantiene GET /health público', async () => {
    await request(app.getHttpServer()).get('/health').expect(200);
  });

  it('rechaza GET /auth/me cuando falta el token', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('permite GET /auth/me con un JWT válido', async () => {
    await request(app.getHttpServer()).get('/auth/me').set('Authorization', `Bearer ${token}`).expect(200);
  });

  it('rechaza GET /auth/me cuando el JWT fue alterado', async () => {
    const altered = `${token.slice(0, -1)}${token.endsWith('a') ? 'b' : 'a'}`;
    await request(app.getHttpServer()).get('/auth/me').set('Authorization', `Bearer ${altered}`).expect(401);
  });

  it('rechaza un JWT vencido', async () => {
    const expiredToken = new JwtService().sign(
      { sub: 'expired-user', correo: 'expired@example.com' },
      { secret: 'test-only-secret-for-jest', expiresIn: -1 },
    );
    await request(app.getHttpServer()).get('/auth/me').set('Authorization', `Bearer ${expiredToken}`).expect(401);
  });
});
