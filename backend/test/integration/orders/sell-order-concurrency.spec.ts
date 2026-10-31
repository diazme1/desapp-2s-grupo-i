import request from 'supertest';
import { JwtTokenService } from '../../../src/auth/strategies/jwt-token.service';
import { UserRole } from '../../../src/users/domain/user';
import {
  createOrdersIntegrationApp,
  type OrdersIntegrationApp,
} from './orders-integration-app';
import { SELL_IDS, seedSellMarket } from './sell-order-fixtures';

const BUYER = '20000000-0000-4000-8000-000000000020';

describe('concurrencia de POST /orders/sell', () => {
  let integration: OrdersIntegrationApp;

  beforeAll(async () => {
    integration = await createOrdersIntegrationApp();
  });

  beforeEach(async () => {
    await integration.resetData();
    await seedSellMarket(integration, { superadminBalance: null });
  });

  afterAll(async () => integration?.close());

  it('serializa ventas concurrentes y conserva el suministro total', async () => {
    const sellerToken = token(
      integration,
      SELL_IDS.seller,
      'seller@example.com',
      UserRole.USER,
    );
    const responses = await Promise.all(
      Array.from({ length: 20 }, (_, index) =>
        request(integration.app.getHttpServer())
          .post('/orders/sell')
          .set('Authorization', `Bearer ${sellerToken}`)
          .set('Idempotency-Key', `sell-concurrent-${index}`)
          .send({ idJugador: SELL_IDS.player, cantidadTokens: 1 }),
      ),
    );

    expect(responses.every((response) => response.status === 201)).toBe(true);
    const owners = await integration.dataSource.query(
      `SELECT id_usuario_owner, count(*)::int AS cantidad
       FROM tokens WHERE id_jugador = $1 GROUP BY id_usuario_owner ORDER BY id_usuario_owner`,
      [SELL_IDS.player],
    );
    expect(owners).toEqual([
      { id_usuario_owner: SELL_IDS.admin, cantidad: 20 },
      { id_usuario_owner: SELL_IDS.seller, cantidad: 80 },
    ]);
    const [total] = await integration.dataSource.query(
      'SELECT sum(cantidad_tokens)::int AS total FROM tenencias_jugador WHERE id_jugador = $1',
      [SELL_IDS.player],
    );
    expect(total.total).toBe(100);
    expect(
      await integration.dataSource.query(
        'SELECT count(*)::int AS count FROM transacciones_mercado WHERE tipo = $1',
        ['VENTA'],
      ),
    ).toEqual([{ count: 20 }]);
  });

  it('serializa compra y venta concurrentes sobre el mismo jugador', async () => {
    await preparePurchaseCounterparty();
    const sellerToken = token(
      integration,
      SELL_IDS.seller,
      'seller@example.com',
      UserRole.USER,
    );
    const buyerToken = token(
      integration,
      BUYER,
      'buying-user@example.com',
      UserRole.USER,
    );
    const app = integration.app.getHttpServer();
    const [sellResponse, buyResponse] = await Promise.all([
      request(app)
        .post('/orders/sell')
        .set('Authorization', `Bearer ${sellerToken}`)
        .set('Idempotency-Key', 'sell-buy-race')
        .send({ idJugador: SELL_IDS.player, cantidadTokens: 1 }),
      request(app)
        .post('/orders/buy')
        .set('Authorization', `Bearer ${buyerToken}`)
        .set('Idempotency-Key', 'buy-sell-race')
        .send({ idJugador: SELL_IDS.player, cantidadTokens: 1 }),
    ]);

    expect(sellResponse.status).toBe(201);
    expect(buyResponse.status).toBe(201);
    const owners = await integration.dataSource.query(
      `SELECT id_usuario_owner, count(*)::int AS cantidad
       FROM tokens WHERE id_jugador = $1 GROUP BY id_usuario_owner ORDER BY id_usuario_owner`,
      [SELL_IDS.player],
    );
    expect(owners).toEqual([
      { id_usuario_owner: SELL_IDS.admin, cantidad: 50 },
      { id_usuario_owner: SELL_IDS.seller, cantidad: 49 },
      { id_usuario_owner: BUYER, cantidad: 1 },
    ]);
    const [total] = await integration.dataSource.query(
      'SELECT sum(cantidad_tokens)::int AS total FROM tenencias_jugador WHERE id_jugador = $1',
      [SELL_IDS.player],
    );
    expect(total.total).toBe(100);
  });

  it('coordina venta y recálculo usando un snapshot de cotización coherente', async () => {
    const sellerToken = token(
      integration,
      SELL_IDS.seller,
      'seller@example.com',
      UserRole.USER,
    );
    const adminToken = token(
      integration,
      SELL_IDS.admin,
      integration.superadminEmail,
      UserRole.SUPERADMIN,
    );
    const app = integration.app.getHttpServer();
    const [sale, recalc] = await Promise.all([
      request(app)
        .post('/orders/sell')
        .set('Authorization', `Bearer ${sellerToken}`)
        .set('Idempotency-Key', 'sell-recalculate-race')
        .send({ idJugador: SELL_IDS.player, cantidadTokens: 1 }),
      request(app)
        .post('/quotes/recalculate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ estrategia: 'ataque_decisivo' }),
    ]);

    expect(sale.status).toBe(201);
    expect(recalc.status).toBe(200);
    const [operation] = await integration.dataSource.query(
      `SELECT id_recalculo AS "idRecalculo", tipo_estrategia AS estrategia,
              cotizacion::text AS cotizacion, importe_creditos AS importe
       FROM transacciones_mercado WHERE tipo = 'VENTA'`,
    );
    const [active] = await integration.dataSource.query(
      `SELECT id_recalculo AS "idRecalculo", tipo_estrategia AS estrategia
       FROM recalculo_cotizacion_activo WHERE id = 1`,
    );
    expect(operation.estrategia).toBe('ataque_decisivo');
    expect([SELL_IDS.recalc, recalc.body.idRecalculo]).toContain(
      operation.idRecalculo,
    );
    expect(BigInt(operation.importe)).toBe(
      BigInt(Math.round(Number(operation.cotizacion) * 100)),
    );
    if (operation.idRecalculo === active.idRecalculo)
      expect(operation.idRecalculo).toBe(active.idRecalculo);
    else expect(operation.idRecalculo).toBe(SELL_IDS.recalc);
  });

  async function preparePurchaseCounterparty(): Promise<void> {
    await integration.dataSource.query(
      `INSERT INTO usuarios (id, correo, password_hash, rol)
       VALUES ($1, 'buying-user@example.com', 'hash', 'usuario')`,
      [BUYER],
    );
    await integration.dataSource.query(
      'INSERT INTO saldos_usuario (id_usuario, creditos_disponibles) VALUES ($1, 100000)',
      [BUYER],
    );
    await integration.dataSource.query(
      `UPDATE tokens SET id_usuario_owner = $1
       WHERE id_jugador = $2 AND numero_emision <= 50`,
      [SELL_IDS.admin, SELL_IDS.player],
    );
    await integration.dataSource.query(
      `UPDATE tenencias_jugador SET cantidad_tokens = 50
       WHERE id_usuario = $1 AND id_jugador = $2`,
      [SELL_IDS.seller, SELL_IDS.player],
    );
    await integration.dataSource.query(
      `INSERT INTO tenencias_jugador
        (id_tenencia, id_usuario, id_jugador, cantidad_tokens)
       VALUES ($1, $2, $3, 50)`,
      ['20000000-0000-4000-8000-000000000098', SELL_IDS.admin, SELL_IDS.player],
    );
    await integration.dataSource.query(
      'INSERT INTO saldos_usuario (id_usuario, creditos_disponibles) VALUES ($1, 0)',
      [SELL_IDS.admin],
    );
  }
});

function token(
  integration: OrdersIntegrationApp,
  sub: string,
  correo: string,
  rol: UserRole,
): string {
  return integration.app.get(JwtTokenService).sign({ sub, correo, rol });
}
