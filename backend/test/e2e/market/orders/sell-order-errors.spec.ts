import request from 'supertest';
import { JwtTokenService } from '../../../../src/auth/strategies/jwt-token.service';
import { UserRole } from '../../../../src/users/domain/user';
import {
  createOrdersE2eApp,
  type OrdersE2eApp,
} from './orders-e2e-app';
import { SELL_IDS, seedSellMarket } from './sell-order-fixtures';

describe('errores de POST /orders/sell', () => {
  let e2e: OrdersE2eApp;
  let sellerToken: string;
  let adminToken: string;

  beforeAll(async () => {
    e2e = await createOrdersE2eApp();
  });

  beforeEach(async () => {
    await e2e.resetData();
    await seedSellMarket(e2e, { superadminBalance: null });
    const tokens = e2e.app.get(JwtTokenService);
    sellerToken = tokens.sign({
      sub: SELL_IDS.seller,
      correo: 'seller@example.com',
      rol: UserRole.USER,
    });
    adminToken = tokens.sign({
      sub: SELL_IDS.admin,
      correo: e2e.superadminEmail,
      rol: UserRole.SUPERADMIN,
    });
  });

  afterAll(async () => e2e?.close());

  it('rechaza autenticación, rol vendedor, jugador y body inválidos', async () => {
    const app = e2e.app.getHttpServer();
    await request(app)
      .post('/orders/sell')
      .set('Idempotency-Key', 'sell-no-auth')
      .send({ idJugador: SELL_IDS.player, cantidadTokens: 1 })
      .expect(401);
    await request(app)
      .post('/orders/sell')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Idempotency-Key', 'sell-admin')
      .send({ idJugador: SELL_IDS.player, cantidadTokens: 1 })
      .expect(403);
    await request(app)
      .post('/orders/sell')
      .set('Authorization', `Bearer ${sellerToken}`)
      .set('Idempotency-Key', 'sell-missing-player')
      .send({
        idJugador: '30000000-0000-4000-8000-000000000010',
        cantidadTokens: 1,
      })
      .expect(404);
    await request(app)
      .post('/orders/sell')
      .set('Authorization', `Bearer ${sellerToken}`)
      .set('Idempotency-Key', 'sell-invalid-body')
      .send({ idJugador: SELL_IDS.player, cantidadTokens: 0 })
      .expect(422);
  });

  it('rechaza claves inválidas y no deja efectos', async () => {
    const before = await marketState(e2e);
    for (const [_name, key] of [
      ['missing', undefined],
      ['empty', ''],
      ['spaces', 'sell key'],
      ['invalid', 'sell/key'],
      ['too-long', 'a'.repeat(129)],
    ] as const) {
      const http = request(e2e.app.getHttpServer())
        .post('/orders/sell')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ idJugador: SELL_IDS.player, cantidadTokens: 1 });
      if (key !== undefined) http.set('Idempotency-Key', key);
      await http.expect(422);
      expect(await marketState(e2e)).toEqual(before);
    }
  });

  it('rechaza tokens y cotización inválidos sin cambios parciales', async () => {
    const app = e2e.app.getHttpServer();
    await request(app)
      .post('/orders/sell')
      .set('Authorization', `Bearer ${sellerToken}`)
      .set('Idempotency-Key', 'sell-too-many')
      .send({ idJugador: SELL_IDS.player, cantidadTokens: 101 })
      .expect(422);

    await e2e.dataSource.query(
      `UPDATE tokens SET id_usuario_owner = $1
       WHERE id_jugador = $2 AND numero_emision = 1`,
      [SELL_IDS.admin, SELL_IDS.player],
    );
    await e2e.dataSource.query(
      `UPDATE tenencias_jugador SET cantidad_tokens = 99
       WHERE id_usuario = $1 AND id_jugador = $2`,
      [SELL_IDS.seller, SELL_IDS.player],
    );
    await e2e.dataSource.query(
      `INSERT INTO tenencias_jugador
        (id_tenencia, id_usuario, id_jugador, cantidad_tokens)
       VALUES ($1, $2, $3, 1)`,
      ['30000000-0000-4000-8000-000000000098', SELL_IDS.admin, SELL_IDS.player],
    );
    const beforeTokens = await marketState(e2e);
    await request(app)
      .post('/orders/sell')
      .set('Authorization', `Bearer ${sellerToken}`)
      .set('Idempotency-Key', 'sell-too-many-owned')
      .send({ idJugador: SELL_IDS.player, cantidadTokens: 100 })
      .expect(409);
    expect(await marketState(e2e)).toEqual(beforeTokens);

    await e2e.dataSource.query(
      `UPDATE recalculo_cotizacion_activo
       SET id_recalculo = NULL, tipo_estrategia = NULL WHERE id = 1`,
    );
    await request(app)
      .post('/orders/sell')
      .set('Authorization', `Bearer ${sellerToken}`)
      .set('Idempotency-Key', 'sell-no-quote')
      .send({ idJugador: SELL_IDS.player, cantidadTokens: 1 })
      .expect(409);
    await e2e.dataSource.query(
      `UPDATE recalculo_cotizacion_activo
       SET id_recalculo = $1, tipo_estrategia = 'ataque_decisivo' WHERE id = 1`,
      [SELL_IDS.recalc],
    );

    await e2e.dataSource.query(
      'UPDATE saldos_usuario SET creditos_disponibles = 0 WHERE id_usuario = $1',
      [SELL_IDS.seller],
    );
    await request(app)
      .post('/orders/sell')
      .set('Authorization', `Bearer ${sellerToken}`)
      .set('Idempotency-Key', 'sell-common-balance')
      .send({ idJugador: SELL_IDS.player, cantidadTokens: 1 })
      .expect(201);
    expect(
      await e2e.dataSource.query(
        'SELECT id_usuario, creditos_disponibles FROM saldos_usuario ORDER BY id_usuario',
      ),
    ).toEqual([
      { id_usuario: SELL_IDS.admin, creditos_disponibles: '-1234' },
      { id_usuario: SELL_IDS.seller, creditos_disponibles: '1234' },
    ]);
    expect(
      await e2e.dataSource.query(
        'SELECT count(*)::int AS count FROM transacciones_mercado',
      ),
    ).toEqual([{ count: 1 }]);
  });
});

async function marketState(e2e: OrdersE2eApp) {
  const [tokens, holdings, balances, transactions, audits] = await Promise.all([
    e2e.dataSource.query(
      'SELECT id_token, id_usuario_owner FROM tokens ORDER BY id_token',
    ),
    e2e.dataSource.query(
      'SELECT id_usuario, cantidad_tokens FROM tenencias_jugador ORDER BY id_usuario',
    ),
    e2e.dataSource.query(
      'SELECT id_usuario, creditos_disponibles FROM saldos_usuario ORDER BY id_usuario',
    ),
    e2e.dataSource.query(
      'SELECT count(*)::int AS count FROM transacciones_mercado',
    ),
    e2e.dataSource.query(
      'SELECT count(*)::int AS count FROM auditorias_transaccion',
    ),
  ]);
  return { tokens, holdings, balances, transactions, audits };
}
