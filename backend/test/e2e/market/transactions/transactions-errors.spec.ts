import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { JwtTokenService } from '../../../../src/auth/strategies/jwt-token.service';
import {
  createOrdersE2eApp,
  type OrdersE2eApp,
} from '../orders/orders-e2e-app';
import { registerTransactionUser } from './transactions-fixtures';

const MISSING_USER_ID = '62000000-0000-4000-8000-000000000001';
const OTHER_USER_ID = '62000000-0000-4000-8000-000000000002';

describe('errores de GET /users/:id/transactions', () => {
  let e2e: OrdersE2eApp;
  let app: INestApplication;

  beforeAll(async () => {
    e2e = await createOrdersE2eApp();
    app = e2e.app;
  });

  beforeEach(async () => e2e.resetData());
  afterAll(async () => e2e?.close());

  it('devuelve 401 sin JWT', async () => {
    const user = await registerTransactionUser(app, 'errors-unauthorized');

    await request(app.getHttpServer())
      .get(`/users/${user.id}/transactions`)
      .expect(401);
  });

  it('devuelve 403 para un UUID ajeno', async () => {
    const user = await registerTransactionUser(app, 'errors-forbidden');

    await request(app.getHttpServer())
      .get(`/users/${OTHER_USER_ID}/transactions`)
      .set('Authorization', `Bearer ${user.token}`)
      .expect(403);
  });

  it('devuelve 404 para el UUID propio inexistente', async () => {
    const token = app.get(JwtTokenService).sign({
      sub: MISSING_USER_ID,
      correo: 'missing-transactions@example.com',
    });

    await request(app.getHttpServer())
      .get(`/users/${MISSING_USER_ID}/transactions`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('devuelve 422 para un UUID inválido', async () => {
    const user = await registerTransactionUser(app, 'errors-uuid');

    await request(app.getHttpServer())
      .get('/users/not-a-uuid/transactions')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(422);
  });
});
