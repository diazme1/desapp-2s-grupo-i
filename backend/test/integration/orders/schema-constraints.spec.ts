import {
  createOrdersIntegrationApp,
  type OrdersIntegrationApp,
} from './orders-integration-app';

describe('esquema de órdenes de compra', () => {
  let integration: OrdersIntegrationApp;

  beforeAll(async () => {
    integration = await createOrdersIntegrationApp();
  });
  afterAll(async () => integration?.close());

  it('mantiene checks, unicidad y append-only en PostgreSQL', async () => {
    const db = integration.dataSource;
    const constraints = await db.query(
      `SELECT conname FROM pg_constraint
       WHERE conrelid IN ('ordenes_compra'::regclass, 'auditorias_orden_compra'::regclass)`,
    );
    expect(constraints.map((row: { conname: string }) => row.conname)).toEqual(
      expect.arrayContaining([
        'uq_ordenes_compra_clave_idempotencia',
        'ck_ordenes_compra_clave_idempotencia',
        'ck_ordenes_compra_cantidad_tokens',
      ]),
    );
    const triggers = await db.query(
      `SELECT tgname FROM pg_trigger
       WHERE tgrelid IN ('ordenes_compra'::regclass, 'auditorias_orden_compra'::regclass)
         AND NOT tgisinternal`,
    );
    expect(triggers.map((row: { tgname: string }) => row.tgname)).toEqual(
      expect.arrayContaining([
        'trg_orden_compra_inmutable',
        'trg_auditoria_orden_compra_append_only',
      ]),
    );
  });
});
