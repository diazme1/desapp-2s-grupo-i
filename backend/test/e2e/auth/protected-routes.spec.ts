import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { createE2eApp, E2eApp } from '../helpers/e2e-app';

describe('rutas protegidas', () => {
  let app: INestApplication;
  let e2e: E2eApp;
  let token = '';

  beforeAll(async () => {
    e2e = await createE2eApp();
    app = e2e.app;
  });
  beforeEach(async () => {
    await request(app.getHttpServer()).post('/auth/register').send({ correo: 'me@example.com', password: 'secret123' }).expect(201);
    token = (await request(app.getHttpServer()).post('/auth/login').send({ correo: 'me@example.com', password: 'secret123' }).expect(200)).body.accessToken;
  });
  afterEach(async () => e2e?.resetData());
  afterAll(async () => e2e?.close());

  it('mantiene GET /health público', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(200);
    expect(response.body.status).toBe('ok');
  });

  it('rechaza GET /auth/me cuando falta el token', async () => {
    const response = await request(app.getHttpServer()).get('/auth/me').expect(401);
    expect(response.body.statusCode).toBe(401);
  });

  it('permite GET /auth/me con un JWT válido', async () => {
    const response = await request(app.getHttpServer()).get('/auth/me').set('Authorization', `Bearer ${token}`).expect(200);
    expect(response.body.correo).toBe('me@example.com');
  });

  it('rechaza GET /auth/me cuando el JWT fue alterado', async () => {
    const altered = `${token.slice(0, -1)}${token.endsWith('a') ? 'b' : 'a'}`;
    const response = await request(app.getHttpServer()).get('/auth/me').set('Authorization', `Bearer ${altered}`).expect(401);
    expect(response.body.statusCode).toBe(401);
  });

  it('rechaza un JWT vencido', async () => {
    const expiredToken = new JwtService().sign(
      { sub: 'expired-user', correo: 'expired@example.com' },
      { secret: 'test-only-secret-for-jest', expiresIn: -1 },
    );
    const response = await request(app.getHttpServer()).get('/auth/me').set('Authorization', `Bearer ${expiredToken}`).expect(401);
    expect(response.body.statusCode).toBe(401);
  });
});
