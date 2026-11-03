import request from 'supertest';
import { JwtTokenService } from '../../../../src/auth/strategies/jwt-token.service';
import { UserRole } from '../../../../src/users/domain/user';
import {
  createOrdersE2eApp,
  type OrdersE2eApp,
} from './orders-e2e-app';
import { SELL_IDS, seedSellMarket } from './sell-order-fixtures';

type FailureTarget =
  | 'tokens'
  | 'tenencias_jugador'
  | 'saldos_usuario'
  | 'transacciones_mercado'
  | 'auditorias_transaccion';

describe('rollback de POST /orders/sell', () => {
  let e2e: OrdersE2eApp;
  let sellerToken: string;

  beforeAll(async () => {
    e2e = await createOrdersE2eApp();
  });

  beforeEach(async () => {
    await e2e.resetData();
    await seedSellMarket(e2e, { superadminBalance: null });
    sellerToken = e2e.app.get(JwtTokenService).sign({
      sub: SELL_IDS.seller,
      correo: 'seller@example.com',
      rol: UserRole.USER,
    });
  });

  afterAll(async () => e2e?.close());

  it.each([
    ['tokens', 'tokens'],
    ['tenencia', 'tenencias_jugador'],
    ['saldo', 'saldos_usuario'],
    ['transacción', 'transacciones_mercado'],
    ['auditoría', 'auditorias_transaccion'],
  ] as const)(
    'revierte toda la venta si falla la escritura de %s y permite reintento',
    async (_name, table) => {
      const trigger = await installFailureTrigger(e2e, table);
      try {
        await request(e2e.app.getHttpServer())
          .post('/orders/sell')
          .set('Authorization', `Bearer ${sellerToken}`)
          .set('Idempotency-Key', `sell-rollback-${table}`)
          .send({ idJugador: SELL_IDS.player, cantidadTokens: 2 })
          .expect(500);
      } finally {
        await removeFailureTrigger(e2e, trigger);
      }

      await expectStateUnchanged(e2e);
      const retry = await request(e2e.app.getHttpServer())
        .post('/orders/sell')
        .set('Authorization', `Bearer ${sellerToken}`)
        .set('Idempotency-Key', `sell-rollback-${table}`)
        .send({ idJugador: SELL_IDS.player, cantidadTokens: 2 })
        .expect(201);
      expect(retry.body.importe).toBe('24.68');
    },
  );
});

async function installFailureTrigger(
  e2e: OrdersE2eApp,
  table: FailureTarget,
): Promise<{ trigger: string; functionName: string }> {
  const suffix = table.replaceAll('_', '');
  const functionName = `rechazar_${suffix}_sell_prueba`;
  const trigger = `trg_rechazar_${suffix}_sell_prueba`;
  const operation =
    table === 'tokens' ||
    table === 'tenencias_jugador' ||
    table === 'saldos_usuario'
      ? 'UPDATE'
      : 'INSERT';
  await e2e.dataSource.query(`
    CREATE FUNCTION ${functionName}() RETURNS trigger AS $$
    BEGIN RAISE EXCEPTION 'fallo de rollback de venta'; END;
    $$ LANGUAGE plpgsql
  `);
  await e2e.dataSource.query(`
    CREATE TRIGGER ${trigger}
    BEFORE ${operation} ON ${table}
    FOR EACH ROW EXECUTE FUNCTION ${functionName}()
  `);
  return { trigger, functionName };
}

async function removeFailureTrigger(
  e2e: OrdersE2eApp,
  failure: { trigger: string; functionName: string },
): Promise<void> {
  const tables: FailureTarget[] = [
    'tokens',
    'tenencias_jugador',
    'saldos_usuario',
    'transacciones_mercado',
    'auditorias_transaccion',
  ];
  for (const table of tables) {
    await e2e.dataSource.query(
      `DROP TRIGGER IF EXISTS ${failure.trigger} ON ${table}`,
    );
  }
  await e2e.dataSource.query(
    `DROP FUNCTION IF EXISTS ${failure.functionName}()`,
  );
}

async function expectStateUnchanged(
  e2e: OrdersE2eApp,
): Promise<void> {
  await expect(
    e2e.dataSource.query(
      'SELECT id_usuario_owner, count(*)::int AS cantidad FROM tokens GROUP BY id_usuario_owner ORDER BY id_usuario_owner',
    ),
  ).resolves.toEqual([{ id_usuario_owner: SELL_IDS.seller, cantidad: 100 }]);
  await expect(
    e2e.dataSource.query(
      'SELECT id_usuario, cantidad_tokens FROM tenencias_jugador ORDER BY id_usuario',
    ),
  ).resolves.toEqual([{ id_usuario: SELL_IDS.seller, cantidad_tokens: 100 }]);
  await expect(
    e2e.dataSource.query(
      'SELECT id_usuario, creditos_disponibles FROM saldos_usuario ORDER BY id_usuario',
    ),
  ).resolves.toEqual([
    { id_usuario: SELL_IDS.seller, creditos_disponibles: '100000' },
  ]);
  await expect(
    e2e.dataSource.query(
      'SELECT count(*)::int AS count FROM transacciones_mercado',
    ),
  ).resolves.toEqual([{ count: 0 }]);
  await expect(
    e2e.dataSource.query(
      'SELECT count(*)::int AS count FROM auditorias_transaccion',
    ),
  ).resolves.toEqual([{ count: 0 }]);
}
