import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { configureApp } from '../../../src/configure-app';
import { startTestDatabase, stopTestDatabase, type TestDatabase } from '../support/postgres';

describe('POST /auth/register', () => {
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
  });
  afterAll(async () => {
    await app?.close();
    await stopTestDatabase(database);
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
  });

  it('crea un usuario con correo normalizado y sin devolver la contraseña', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ correo: ' Created@Example.com ', password: 'secret123' })
      .expect(201);
    expect(response.body.correo).toBe('created@example.com');
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
      .send({ correo: 'extra@example.com', password: 'secret123', role: 'admin' })
      .expect(422);
    expect(response.body.statusCode).toBe(422);
  });
});
