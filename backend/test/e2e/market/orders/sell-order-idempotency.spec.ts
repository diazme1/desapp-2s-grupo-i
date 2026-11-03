import request from 'supertest';
import { JwtTokenService } from '../../../../src/auth/strategies/jwt-token.service';
import { UserRole } from '../../../../src/users/domain/user';
import {
  createOrdersE2eApp,
  type OrdersE2eApp,
} from './orders-e2e-app';
import { SELL_IDS, seedSellMarket } from './sell-order-fixtures';

const OTHER_USER = '20000000-0000-4000-8000-000000000010';
const BUYER = '20000000-0000-4000-8000-000000000011';

describe('idempotencia común de POST /orders/sell', () => {
  let e2e: OrdersE2eApp;
  let sellerToken: string;
  let otherToken: string;

  beforeAll(async () => {
    e2e = await createOrdersE2eApp();
  });

  beforeEach(async () => {
    await e2e.resetData();
    await seedSellMarket(e2e, { superadminBalance: null });
    await e2e.dataSource.query(
      `INSERT INTO usuarios (id, correo, password_hash, rol)
       VALUES ($1, 'other-seller@example.com', 'hash', 'usuario'),
              ($2, 'buying-user@example.com', 'hash', 'usuario')`,
      [OTHER_USER, BUYER],
    );
    await e2e.dataSource.query(
      `INSERT INTO saldos_usuario (id_usuario, creditos_disponibles)
       VALUES ($1, 0), ($2, 100000)`,
      [OTHER_USER, BUYER],
    );
    const tokens = e2e.app.get(JwtTokenService);
    sellerToken = tokens.sign({
      sub: SELL_IDS.seller,
      correo: 'seller@example.com',
      rol: UserRole.USER,
    });
    otherToken = tokens.sign({
      sub: OTHER_USER,
      correo: 'other-seller@example.com',
      rol: UserRole.USER,
    });
  });

  afterAll(async () => e2e?.close());

  it('repite la venta confirmada sin duplicar tokens, saldos, operación ni auditoría', async () => {
    const app = e2e.app.getHttpServer();
    const first = await request(app)
      .post('/orders/sell')
      .set('Authorization', `Bearer ${sellerToken}`)
      .set('Idempotency-Key', 'sell-replay')
      .send({ idJugador: SELL_IDS.player, cantidadTokens: 3 })
      .expect(201);
    const second = await request(app)
      .post('/orders/sell')
      .set('Authorization', `Bearer ${sellerToken}`)
      .set('Idempotency-Key', 'sell-replay')
      .send({ idJugador: SELL_IDS.player, cantidadTokens: 3 })
      .expect(201);

    expect(second.body).toEqual(first.body);
    expect(
      await e2e.dataSource.query(
        'SELECT count(*)::int AS count FROM transacciones_mercado',
      ),
    ).toEqual([{ count: 1 }]);
    expect(
      await e2e.dataSource.query(
        'SELECT count(*)::int AS count FROM auditorias_transaccion',
      ),
    ).toEqual([{ count: 1 }]);
    expect(
      await e2e.dataSource.query(
        'SELECT count(*)::int AS count FROM tokens WHERE id_usuario_owner = $1',
        [SELL_IDS.admin],
      ),
    ).toEqual([{ count: 3 }]);
  });

  it('rechaza payload y actor incompatibles sin nuevos efectos', async () => {
    const app = e2e.app.getHttpServer();
    await request(app)
      .post('/orders/sell')
      .set('Authorization', `Bearer ${sellerToken}`)
      .set('Idempotency-Key', 'sell-conflict')
      .send({ idJugador: SELL_IDS.player, cantidadTokens: 2 })
      .expect(201);
    await request(app)
      .post('/orders/sell')
      .set('Authorization', `Bearer ${sellerToken}`)
      .set('Idempotency-Key', 'sell-conflict')
      .send({ idJugador: SELL_IDS.player, cantidadTokens: 3 })
      .expect(409);
    await request(app)
      .post('/orders/sell')
      .set('Authorization', `Bearer ${otherToken}`)
      .set('Idempotency-Key', 'sell-conflict')
      .send({ idJugador: SELL_IDS.player, cantidadTokens: 2 })
      .expect(409);
    expect(
      await e2e.dataSource.query(
        'SELECT count(*)::int AS count FROM transacciones_mercado',
      ),
    ).toEqual([{ count: 1 }]);
  });

  it('rechaza usar en una venta una clave ya confirmada por una compra', async () => {
    await e2e.dataSource.query(
      `UPDATE tokens SET id_usuario_owner = $1
       WHERE id_jugador = $2 AND numero_emision = 1`,
      [SELL_IDS.admin, SELL_IDS.player],
    );
    await e2e.dataSource.query(
      `UPDATE tenencias_jugador
       SET cantidad_tokens = 99 WHERE id_usuario = $1 AND id_jugador = $2`,
      [SELL_IDS.seller, SELL_IDS.player],
    );
    await e2e.dataSource.query(
      `INSERT INTO tenencias_jugador
        (id_tenencia, id_usuario, id_jugador, cantidad_tokens)
       VALUES ($1, $2, $3, 1)`,
      ['20000000-0000-4000-8000-000000000098', SELL_IDS.admin, SELL_IDS.player],
    );

    const buyerToken = e2e.app.get(JwtTokenService).sign({
      sub: BUYER,
      correo: 'buying-user@example.com',
      rol: UserRole.USER,
    });
    const app = e2e.app.getHttpServer();
    await request(app)
      .post('/orders/buy')
      .set('Authorization', `Bearer ${buyerToken}`)
      .set('Idempotency-Key', 'shared-market-key')
      .send({ idJugador: SELL_IDS.player, cantidadTokens: 1 })
      .expect(201);
    await request(app)
      .post('/orders/sell')
      .set('Authorization', `Bearer ${sellerToken}`)
      .set('Idempotency-Key', 'shared-market-key')
      .send({ idJugador: SELL_IDS.player, cantidadTokens: 1 })
      .expect(409);
    expect(
      await e2e.dataSource.query(
        `SELECT tipo, count(*)::int AS count
         FROM transacciones_mercado GROUP BY tipo`,
      ),
    ).toEqual([{ tipo: 'COMPRA', count: 1 }]);
  });
});
