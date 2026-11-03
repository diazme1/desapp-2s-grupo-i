import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  createE2eApp,
  E2eApp,
} from '../helpers/e2e-app';

describe('POST /auth/register', () => {
  let app: INestApplication;
  let e2e: E2eApp;
  beforeAll(async () => {
    e2e = await createE2eApp();
    app = e2e.app;
  });
  afterEach(async () => e2e?.resetData());
  afterAll(async () => e2e?.close());

  it('crea un usuario con correo normalizado y sin devolver la contraseña', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ correo: ' Created@Example.com ', password: 'secret123' })
      .expect(201);
    expect(response.body.correo).toBe('created@example.com');
    expect(response.body.rol).toBe('usuario');
    expect(response.body.password).toBeUndefined();
    expect(response.body.passwordHash).toBeUndefined();
  });

  it('rechaza un correo duplicado con 409', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ correo: 'duplicate@example.com', password: 'secret123' })
      .expect(201);
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ correo: 'DUPLICATE@example.com', password: 'secret123' })
      .expect(409);
    expect(response.body.statusCode).toBe(409);
  });

  it('rechaza un correo o password inválidos con 422', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ correo: 'bad', password: 'x' })
      .expect(422);
    expect(response.body.statusCode).toBe(422);
  });

  it('rechaza propiedades no permitidas con 422', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        correo: 'extra@example.com',
        password: 'secret123',
        role: 'admin',
      })
      .expect(422);
    expect(response.body.statusCode).toBe(422);
  });
});
