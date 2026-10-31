import request from 'supertest';
import { JwtTokenService } from '../../../src/auth/strategies/jwt-token.service';
import { UserRole } from '../../../src/users/domain/user';
import {
  createOrdersIntegrationApp,
  type OrdersIntegrationApp,
} from './orders-integration-app';
import { SELL_IDS, seedSellMarket } from './sell-order-fixtures';

describe('POST /orders/sell', () => {
  let integration: OrdersIntegrationApp;
  let token: string;

  beforeAll(async () => {
    integration = await createOrdersIntegrationApp();
  });

  beforeEach(async () => {
    await integration.resetData();
    await seedSellMarket(integration, { superadminBalance: null });
    token = integration.app.get(JwtTokenService).sign({
      sub: SELL_IDS.seller,
      correo: 'seller@example.com',
      rol: UserRole.USER,
    });
  });

  afterAll(async () => integration?.close());

  it('confirma una venta parcial con el contrato de buy, importes exactos y auditoría', async () => {
    const response = await request(integration.app.getHttpServer())
      .post('/orders/sell')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', ' sell-partial-1 ')
      .send({ idJugador: SELL_IDS.player, cantidadTokens: 2 })
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        idJugador: SELL_IDS.player,
        idComprador: SELL_IDS.admin,
        idVendedor: SELL_IDS.seller,
        cantidadTokens: 2,
        cotizacion: '12.34',
        importe: '24.68',
        idempotencyKey: 'sell-partial-1',
      }),
    );
    const balances = await integration.dataSource.query(
      'SELECT id_usuario, creditos_disponibles FROM saldos_usuario ORDER BY id_usuario',
    );
    expect(balances).toEqual([
      { id_usuario: SELL_IDS.admin, creditos_disponibles: '-2468' },
      { id_usuario: SELL_IDS.seller, creditos_disponibles: '102468' },
    ]);
    const owners = await integration.dataSource.query(
      `SELECT id_usuario_owner, count(*)::int AS cantidad
       FROM tokens WHERE id_jugador = $1 GROUP BY id_usuario_owner ORDER BY id_usuario_owner`,
      [SELL_IDS.player],
    );
    expect(owners).toEqual([
      { id_usuario_owner: SELL_IDS.admin, cantidad: 2 },
      { id_usuario_owner: SELL_IDS.seller, cantidad: 98 },
    ]);
    const holdings = await integration.dataSource.query(
      `SELECT id_usuario, cantidad_tokens FROM tenencias_jugador
       WHERE id_jugador = $1 ORDER BY id_usuario`,
      [SELL_IDS.player],
    );
    expect(holdings).toEqual([
      { id_usuario: SELL_IDS.admin, cantidad_tokens: 2 },
      { id_usuario: SELL_IDS.seller, cantidad_tokens: 98 },
    ]);
    expect(
      await integration.dataSource.query(
        `SELECT tipo, id_usuario_comprador, id_usuario_vendedor,
                cantidad_tokens, cotizacion::text AS cotizacion,
                importe_creditos, id_recalculo
         FROM transacciones_mercado`,
      ),
    ).toEqual([
      {
        tipo: 'VENTA',
        id_usuario_comprador: SELL_IDS.admin,
        id_usuario_vendedor: SELL_IDS.seller,
        cantidad_tokens: 2,
        cotizacion: '12.34',
        importe_creditos: '2468',
        id_recalculo: SELL_IDS.recalc,
      },
    ]);
    expect(
      await integration.dataSource.query(
        'SELECT count(*)::int AS count FROM auditorias_transaccion WHERE tipo = $1',
        ['VENTA'],
      ),
    ).toEqual([{ count: 1 }]);
  });

  it('confirma una venta total, conserva el suministro de 100 y permite saldo superadmin cero', async () => {
    await integration.dataSource.query(
      'INSERT INTO saldos_usuario (id_usuario, creditos_disponibles) VALUES ($1, 0)',
      [SELL_IDS.admin],
    );
    const response = await request(integration.app.getHttpServer())
      .post('/orders/sell')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'sell-total-1')
      .send({ idJugador: SELL_IDS.player, cantidadTokens: 100 })
      .expect(201);

    expect(response.body.importe).toBe('1234.00');
    const owners = await integration.dataSource.query(
      `SELECT id_usuario_owner, count(*)::int AS cantidad
       FROM tokens WHERE id_jugador = $1 GROUP BY id_usuario_owner`,
      [SELL_IDS.player],
    );
    expect(owners).toEqual([
      { id_usuario_owner: SELL_IDS.admin, cantidad: 100 },
    ]);
    const [sellerBalance, adminBalance] = await Promise.all([
      integration.dataSource.query(
        'SELECT creditos_disponibles FROM saldos_usuario WHERE id_usuario = $1',
        [SELL_IDS.seller],
      ),
      integration.dataSource.query(
        'SELECT creditos_disponibles FROM saldos_usuario WHERE id_usuario = $1',
        [SELL_IDS.admin],
      ),
    ]);
    expect(sellerBalance).toEqual([{ creditos_disponibles: '223400' }]);
    expect(adminBalance).toEqual([{ creditos_disponibles: '-123400' }]);
    const [sum] = await integration.dataSource.query(
      'SELECT sum(cantidad_tokens)::int AS total FROM tenencias_jugador WHERE id_jugador = $1',
      [SELL_IDS.player],
    );
    expect(sum.total).toBe(100);
  });

  it('recompra aunque el superadmin tenga saldo insuficiente y acredita/debita el importe exacto', async () => {
    await integration.dataSource.query(
      'INSERT INTO saldos_usuario (id_usuario, creditos_disponibles) VALUES ($1, 1)',
      [SELL_IDS.admin],
    );
    const response = await request(integration.app.getHttpServer())
      .post('/orders/sell')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'sell-admin-insufficient')
      .send({ idJugador: SELL_IDS.player, cantidadTokens: 1 })
      .expect(201);

    expect(response.body.importe).toBe('12.34');
    expect(
      await integration.dataSource.query(
        'SELECT id_usuario, creditos_disponibles FROM saldos_usuario ORDER BY id_usuario',
      ),
    ).toEqual([
      { id_usuario: SELL_IDS.admin, creditos_disponibles: '-1233' },
      { id_usuario: SELL_IDS.seller, creditos_disponibles: '101234' },
    ]);
  });
});
