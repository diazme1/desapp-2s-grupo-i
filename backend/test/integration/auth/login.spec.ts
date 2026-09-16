import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createIntegrationApp, IntegrationApp } from '../helpers/integration-app';

describe('POST /auth/login', () => {
  let app: INestApplication;
  let integration: IntegrationApp;
  beforeAll(async () => {
    integration = await createIntegrationApp();
    app = integration.app;
  });
  beforeEach(async () => {
    await request(app.getHttpServer()).post('/auth/register').send({ correo: 'login@example.com', password: 'secret123' }).expect(201);
  });
  afterEach(async () => integration?.resetData());
  afterAll(async () => integration?.close());

  it('devuelve un JWT Bearer con credenciales válidas', async () => {
    const response = await request(app.getHttpServer()).post('/auth/login').send({ correo: 'LOGIN@example.com', password: 'secret123' }).expect(200);
    expect(response.body.tokenType).toBe('Bearer');
    expect(response.body.accessToken).toEqual(expect.any(String));
  });

  it('rechaza una contraseña incorrecta con 401', async () => {
    await request(app.getHttpServer()).post('/auth/login').send({ correo: 'login@example.com', password: 'wrongpass' }).expect(401);
  });

  it('rechaza un correo inexistente con 401 sin revelar si existe', async () => {
    await request(app.getHttpServer()).post('/auth/login').send({ correo: 'missing@example.com', password: 'wrongpass' }).expect(401);
  });
});
