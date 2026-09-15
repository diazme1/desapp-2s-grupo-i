import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { configureApp } from '../../../src/configure-app';
import { startTestDatabase, stopTestDatabase, type TestDatabase } from '../support/postgres';

describe('POST /auth/login', () => {
  let app: INestApplication;
  let database: TestDatabase | undefined;
  const previousDatabaseUrl = process.env.DATABASE_URL;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    database = await startTestDatabase();
    process.env.DATABASE_URL = database.url;
    const module = await Test.createTestingModule({ imports: [AppModule.register('.env.no-test')] }).compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    await request(app.getHttpServer()).post('/auth/register').send({ correo: 'login@example.com', password: 'secret123' }).expect(201);
  });
  afterAll(async () => {
    await app?.close();
    await stopTestDatabase(database);
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
  });

  it('devuelve un JWT Bearer con credenciales válidas', async () => {
    const response = await request(app.getHttpServer()).post('/auth/login').send({ correo: 'LOGIN@example.com', password: 'secret123' }).expect(200);
    expect(response.body.tokenType).toBe('Bearer');
    expect(response.body.accessToken).toEqual(expect.any(String));
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
