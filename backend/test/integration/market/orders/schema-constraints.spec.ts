import {
  createOrdersIntegrationApp,
  type OrdersIntegrationApp,
} from './orders-integration-app';

describe('esquema de transacciones de mercado', () => {
  let integration: OrdersIntegrationApp;

  beforeAll(async () => {
    integration = await createOrdersIntegrationApp();
  });
  afterAll(async () => integration?.close());

  it('mantiene checks, unicidad y append-only en PostgreSQL', async () => {
    const db = integration.dataSource;
    const constraints = await db.query(
      `SELECT conname FROM pg_constraint
       WHERE conrelid IN ('transacciones_mercado'::regclass, 'auditorias_transaccion'::regclass)`,
    );
    expect(constraints.map((row: { conname: string }) => row.conname)).toEqual(
      expect.arrayContaining([
        'uq_transacciones_mercado_clave_idempotencia',
        'ck_transacciones_mercado_clave_idempotencia',
        'ck_transacciones_mercado_cantidad_tokens',
        'ck_transacciones_mercado_tipo',
      ]),
    );
    const triggers = await db.query(
      `SELECT tgname FROM pg_trigger
       WHERE tgrelid IN ('transacciones_mercado'::regclass, 'auditorias_transaccion'::regclass)
         AND NOT tgisinternal`,
    );
    expect(triggers.map((row: { tgname: string }) => row.tgname)).toEqual(
      expect.arrayContaining([
        'trg_transaccion_mercado_inmutable',
        'trg_auditoria_transaccion_append_only',
      ]),
    );
    const saldoChecks = await db.query(
      `SELECT conname, pg_get_constraintdef(oid) AS definition
       FROM pg_constraint
       WHERE conrelid = 'saldos_usuario'::regclass AND contype = 'c'`,
    );
    expect(saldoChecks).toEqual([]);
    const saldoTriggers = await db.query(
      `SELECT tgname FROM pg_trigger
       WHERE tgrelid = 'saldos_usuario'::regclass AND NOT tgisinternal`,
    );
    expect(
      saldoTriggers.map((row: { tgname: string }) => row.tgname),
    ).toContain('trg_saldos_usuario_rol_integridad');
  });
});
