import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { configureApp } from '../../../src/configure-app';

describe('POST /auth/register', () => {
  let app: INestApplication;
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    const module = await Test.createTestingModule({ imports: [AppModule.register('.env.no-test')] }).compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
  });
  afterAll(() => app?.close());

  it('registra, normaliza y no expone password', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ correo: ' New@Example.com ', password: 'secret123' })
      .expect(201);
    expect(response.body.correo).toBe('new@example.com');
    expect(response.body.password).toBeUndefined();
    expect(response.body.passwordHash).toBeUndefined();
  });

  it('rechaza duplicado y datos inválidos', async () => {
    await request(app.getHttpServer()).post('/auth/register').send({ correo: 'new@example.com', password: 'secret123' }).expect(409);
    await request(app.getHttpServer()).post('/auth/register').send({ correo: 'bad', password: 'x' }).expect(422);
  });
});
