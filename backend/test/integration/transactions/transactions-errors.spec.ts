import request from 'supertest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { JwtTokenService } from '../../../src/auth/strategies/jwt-token.service';
import { JwtAuthGuard } from '../../../src/auth/guards/jwt-auth.guard';
import { OwnershipService } from '../../../src/auth/ownership/ownership.service';
import { TransactionsController } from '../../../src/transactions/transactions.controller';
import { TransactionsService } from '../../../src/transactions/transactions.service';
import {
  TRANSACTIONS_REPOSITORY,
  type TransactionsReadModel,
} from '../../../src/transactions/transactions.repository';
import {
  createOrdersIntegrationApp,
  type OrdersIntegrationApp,
} from '../orders/orders-integration-app';
import { registerTransactionUser } from './transactions-fixtures';

const MISSING_USER_ID = '62000000-0000-4000-8000-000000000001';
const OTHER_USER_ID = '62000000-0000-4000-8000-000000000002';

describe('errores de GET /users/:id/transactions', () => {
  let integration: OrdersIntegrationApp;
  let app: INestApplication;

  beforeAll(async () => {
    integration = await createOrdersIntegrationApp();
    app = integration.app;
  });

  beforeEach(async () => integration.resetData());
  afterAll(async () => integration?.close());

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

  it('devuelve 409 ante un snapshot inconsistente en un Repository controlado', async () => {
    const controlledApp = await createControlledApp({
      usuarioId: OTHER_USER_ID,
      usuarioExiste: true,
      operaciones: [
        {
          idOperacion: '63000000-0000-4000-8000-000000000001',
          tipo: 'COMPRA',
          jugadorId: '63000000-0000-4000-8000-000000000001',
          nombreCompleto: 'Jugador inconsistente',
          cantidadTokens: 1,
          cotizacion: 'inconsistente',
          importeCreditos: 1n,
          fechaHora: new Date(),
        },
      ],
    });

    try {
      await request(controlledApp.getHttpServer())
        .get(`/users/${OTHER_USER_ID}/transactions`)
        .set('Authorization', 'Bearer controlled')
        .expect(409);
    } finally {
      await controlledApp.close();
    }
  });
});

async function createControlledApp(
  readModel: TransactionsReadModel,
): Promise<INestApplication> {
  const module = await Test.createTestingModule({
    controllers: [TransactionsController],
    providers: [
      TransactionsService,
      OwnershipService,
      {
        provide: TRANSACTIONS_REPOSITORY,
        useValue: { consultar: jest.fn().mockResolvedValue(readModel) },
      },
    ],
  })
    .overrideGuard(JwtAuthGuard)
    .useValue({
      canActivate: (context: { switchToHttp(): { getRequest(): { user?: unknown } } }) => {
        context.switchToHttp().getRequest().user = {
          sub: OTHER_USER_ID,
        };
        return true;
      },
    })
    .compile();
  const app = module.createNestApplication();
  await app.init();
  return app;
}
