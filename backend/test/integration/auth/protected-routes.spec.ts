import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { configureApp } from '../../../src/configure-app';

describe('rutas protegidas', () => {
  let app: INestApplication;
  let token = '';
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    const module = await Test.createTestingModule({ imports: [AppModule.register('.env.no-test')] }).compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    await request(app.getHttpServer()).post('/auth/register').send({ correo: 'me@example.com', password: 'secret123' });
    token = (await request(app.getHttpServer()).post('/auth/login').send({ correo: 'me@example.com', password: 'secret123' })).body.accessToken;
  });
  afterAll(() => app?.close());

  it('mantiene health público y exige JWT para /auth/me', async () => {
    await request(app.getHttpServer()).get('/health').expect(200);
    await request(app.getHttpServer()).get('/auth/me').expect(401);
    await request(app.getHttpServer()).get('/auth/me').set('Authorization', `Bearer ${token}`).expect(200);
  });
});
