import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  createE2eApp,
  E2eApp,
} from '../helpers/e2e-app';

describe('POST /auth/login', () => {
  let app: INestApplication;
  let e2e: E2eApp;
  beforeAll(async () => {
    e2e = await createE2eApp();
    app = e2e.app;
  });
  beforeEach(async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ correo: 'login@example.com', password: 'secret123' })
      .expect(201);
  });
  afterEach(async () => e2e?.resetData());
  afterAll(async () => e2e?.close());

  it('devuelve un JWT Bearer con credenciales válidas', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ correo: 'LOGIN@example.com', password: 'secret123' })
      .expect(200);
    expect(response.body.tokenType).toBe('Bearer');
    expect(response.body.accessToken).toEqual(expect.any(String));

    const profile = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${response.body.accessToken}`)
      .expect(200);
    expect(profile.body.rol).toBe('usuario');
  });

  it('rechaza una contraseña incorrecta con 401', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ correo: 'login@example.com', password: 'wrongpass' })
      .expect(401);
    expect(response.body.statusCode).toBe(401);
  });

  it('rechaza un correo inexistente con 401 sin revelar si existe', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ correo: 'missing@example.com', password: 'wrongpass' })
      .expect(401);
    expect(response.body.statusCode).toBe(401);
  });
});
