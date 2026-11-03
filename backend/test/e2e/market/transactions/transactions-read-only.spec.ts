import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import {
  createOrdersE2eApp,
  type OrdersE2eApp,
} from '../orders/orders-e2e-app';
import {
  insertTransaction,
  registerTransactionUser,
  seedTransactionReferenceData,
  snapshotReadOnlyTables,
} from './transactions-fixtures';

describe('solo lectura y aislamiento de GET /users/:id/transactions', () => {
  let e2e: OrdersE2eApp;
  let app: INestApplication;

  beforeAll(async () => {
    e2e = await createOrdersE2eApp();
    app = e2e.app;
  });

  beforeEach(async () => e2e.resetData());
  afterAll(async () => e2e?.close());

  it('no escribe en las tablas de Mercado durante una consulta', async () => {
    const user = await registerTransactionUser(app, 'read-only');
    const counterparty = await registerTransactionUser(app, 'read-only-party');
    await seedTransactionReferenceData(e2e);
    await insertTransaction(e2e, {
      idOperacion: '64000000-0000-4000-8000-000000000001',
      tipo: 'COMPRA',
      compradorId: user.id,
      vendedorId: counterparty.id,
      cantidadTokens: 1,
      cotizacion: '20.00',
      importeCreditos: 2000n,
      fechaHora: '2026-10-31T12:00:00.000Z',
    });

    const before = await snapshotReadOnlyTables(e2e);
    await request(app.getHttpServer())
      .get(`/users/${user.id}/transactions`)
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);
    const after = await snapshotReadOnlyTables(e2e);

    expect(after).toBe(before);
  });

  it('no devuelve operaciones en las que el usuario no es comprador ni vendedor', async () => {
    const user = await registerTransactionUser(app, 'read-isolation');
    const counterparty = await registerTransactionUser(app, 'read-isolation-party');
    const unrelated = await registerTransactionUser(app, 'read-isolation-other');
    await seedTransactionReferenceData(e2e);
    await insertTransaction(e2e, {
      idOperacion: '64000000-0000-4000-8000-000000000002',
      tipo: 'COMPRA',
      compradorId: user.id,
      vendedorId: counterparty.id,
      cantidadTokens: 1,
      cotizacion: '20.00',
      importeCreditos: 2000n,
      fechaHora: '2026-10-31T12:00:00.000Z',
    });
    await insertTransaction(e2e, {
      idOperacion: '64000000-0000-4000-8000-000000000003',
      tipo: 'VENTA',
      compradorId: counterparty.id,
      vendedorId: unrelated.id,
      cantidadTokens: 1,
      cotizacion: '30.00',
      importeCreditos: 3000n,
      fechaHora: '2026-10-31T12:01:00.000Z',
    });

    const response = await request(app.getHttpServer())
      .get(`/users/${user.id}/transactions`)
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);

    expect(response.body.operaciones).toHaveLength(1);
    expect(response.body.operaciones[0].idOperacion).toBe(
      '64000000-0000-4000-8000-000000000002',
    );
  });
});
