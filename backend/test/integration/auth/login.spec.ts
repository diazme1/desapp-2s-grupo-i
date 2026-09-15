import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { configureApp } from '../../../src/configure-app';

describe('POST /auth/login', () => {
  let app: INestApplication;
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    const module = await Test.createTestingModule({ imports: [AppModule.register('.env.no-test')] }).compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    await request(app.getHttpServer()).post('/auth/register').send({ correo: 'login@example.com', password: 'secret123' }).expect(201);
  });
  afterAll(() => app?.close());

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
