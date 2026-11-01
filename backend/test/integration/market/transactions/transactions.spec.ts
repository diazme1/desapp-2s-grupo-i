import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import {
  createOrdersIntegrationApp,
  type OrdersIntegrationApp,
} from '../orders/orders-integration-app';
import {
  insertTransaction,
  registerTransactionUser,
  seedTransactionReferenceData,
  TRANSACTION_IDS,
} from './transactions-fixtures';

describe('GET /users/:id/transactions', () => {
  let integration: OrdersIntegrationApp;
  let app: INestApplication;

  beforeAll(async () => {
    integration = await createOrdersIntegrationApp();
    app = integration.app;
  });

  beforeEach(async () => {
    await integration.resetData();
  });

  afterAll(async () => integration?.close());

  it('devuelve compras y ventas propias ordenadas y excluye operaciones ajenas', async () => {
    const user = await registerTransactionUser(app, 'history');
    const counterparty = await registerTransactionUser(app, 'counterparty');
    const outsider = await registerTransactionUser(app, 'outsider');
    await seedTransactionReferenceData(integration);

    await insertTransaction(integration, {
      idOperacion: '61000000-0000-4000-8000-000000000001',
      tipo: 'COMPRA',
      compradorId: user.id,
      vendedorId: counterparty.id,
      cantidadTokens: 2,
      cotizacion: '15.25',
      importeCreditos: 3050n,
      fechaHora: '2026-10-31T12:00:00.000Z',
    });
    await insertTransaction(integration, {
      idOperacion: '61000000-0000-4000-8000-000000000002',
      tipo: 'VENTA',
      compradorId: counterparty.id,
      vendedorId: user.id,
      cantidadTokens: 1,
      cotizacion: '99.99',
      importeCreditos: 9999n,
      fechaHora: '2026-10-31T12:00:00.000Z',
    });
    await insertTransaction(integration, {
      idOperacion: '61000000-0000-4000-8000-000000000003',
      tipo: 'COMPRA',
      compradorId: outsider.id,
      vendedorId: counterparty.id,
      cantidadTokens: 4,
      cotizacion: '1.01',
      importeCreditos: 404n,
      fechaHora: '2026-10-30T12:00:00.000Z',
    });

    const response = await request(app.getHttpServer())
      .get(`/users/${user.id}/transactions`)
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);

    expect(response.body).toEqual({
      usuarioId: user.id,
      operaciones: [
        {
          idOperacion: '61000000-0000-4000-8000-000000000001',
          tipo: 'COMPRA',
          idJugador: TRANSACTION_IDS.player,
          nombreCompleto: 'Jugador de transacciones completo',
          cantidadTokens: 2,
          cotizacion: '15.25',
          importe: '30.50',
          fechaHora: '2026-10-31T12:00:00.000Z',
        },
        {
          idOperacion: '61000000-0000-4000-8000-000000000002',
          tipo: 'VENTA',
          idJugador: TRANSACTION_IDS.player,
          nombreCompleto: 'Jugador de transacciones completo',
          cantidadTokens: 1,
          cotizacion: '99.99',
          importe: '99.99',
          fechaHora: '2026-10-31T12:00:00.000Z',
        },
      ],
    });
  });

  it('devuelve operaciones vacías para un usuario propio sin historial', async () => {
    const user = await registerTransactionUser(app, 'empty-history');

    await request(app.getHttpServer())
      .get(`/users/${user.id}/transactions`)
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200)
      .expect({ usuarioId: user.id, operaciones: [] });
  });
});
