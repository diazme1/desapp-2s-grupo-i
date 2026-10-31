import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { JwtTokenService } from '../../../src/auth/strategies/jwt-token.service';
import { UserRole } from '../../../src/users/domain/user';
import {
  createOrdersIntegrationApp,
  type OrdersIntegrationApp,
} from './orders-integration-app';

const IDS = {
  admin: '00000000-0000-4000-8000-000000000001',
  buyer: '00000000-0000-4000-8000-000000000002',
  player: '00000000-0000-4000-8000-000000000003',
  team: '00000000-0000-4000-8000-000000000004',
  league: '00000000-0000-4000-8000-000000000005',
  stats: '00000000-0000-4000-8000-000000000006',
  version: '00000000-0000-4000-8000-000000000007',
  recalc: '00000000-0000-4000-8000-000000000008',
};

describe('POST /orders/buy', () => {
  let integration: OrdersIntegrationApp;
  let token: string;
  let adminToken: string;

  beforeAll(async () => {
    integration = await createOrdersIntegrationApp();
  });

  beforeEach(async () => {
    await integration.resetData();
    await seedMarket(integration);
    token = integration.app.get(JwtTokenService).sign({
      sub: IDS.buyer,
      correo: 'buyer@example.com',
      rol: UserRole.USER,
    });
    adminToken = integration.app.get(JwtTokenService).sign({
      sub: IDS.admin,
      correo: integration.superadminEmail,
      rol: UserRole.SUPERADMIN,
    });
  });

  afterAll(async () => integration?.close());

  it('confirma una compra parcial con importes exactos y auditoría', async () => {
    const response = await request(integration.app.getHttpServer())
      .post('/orders/buy')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', ' buy-partial-1 ')
      .send({ idJugador: IDS.player, cantidadTokens: 2 })
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        idJugador: IDS.player,
        idComprador: IDS.buyer,
        idVendedor: IDS.admin,
        cantidadTokens: 2,
        cotizacion: '12.34',
        importe: '24.68',
        idempotencyKey: 'buy-partial-1',
      }),
    );
    const balances = await integration.dataSource.query(
      'SELECT id_usuario, creditos_disponibles FROM saldos_usuario ORDER BY id_usuario',
    );
    expect(balances).toEqual([
      { id_usuario: IDS.admin, creditos_disponibles: '2468' },
      { id_usuario: IDS.buyer, creditos_disponibles: '97532' },
    ]);
    const owners = await integration.dataSource.query(
      `SELECT id_usuario_owner, count(*)::int AS cantidad
       FROM tokens WHERE id_jugador = $1 GROUP BY id_usuario_owner ORDER BY id_usuario_owner`,
      [IDS.player],
    );
    expect(owners).toEqual([
      { id_usuario_owner: IDS.admin, cantidad: 98 },
      { id_usuario_owner: IDS.buyer, cantidad: 2 },
    ]);
    const holdings = await integration.dataSource.query(
      `SELECT id_usuario, cantidad_tokens FROM tenencias_jugador
       WHERE id_jugador = $1 ORDER BY id_usuario`,
      [IDS.player],
    );
    expect(holdings).toEqual([
      { id_usuario: IDS.admin, cantidad_tokens: 98 },
      { id_usuario: IDS.buyer, cantidad_tokens: 2 },
    ]);
    expect(
      await integration.dataSource.query(
        'SELECT count(*)::int AS count FROM transacciones_mercado',
      ),
    ).toEqual([{ count: 1 }]);
    expect(
      await integration.dataSource.query(
        'SELECT count(*)::int AS count FROM auditorias_transaccion',
      ),
    ).toEqual([{ count: 1 }]);
  });

  it('repite la misma operación sin duplicar efectos', async () => {
    const app = integration.app.getHttpServer();
    const first = await request(app)
      .post('/orders/buy')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'buy-replay')
      .send({ idJugador: IDS.player, cantidadTokens: 3 })
      .expect(201);
    const second = await request(app)
      .post('/orders/buy')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'buy-replay')
      .send({ idJugador: IDS.player, cantidadTokens: 3 })
      .expect(201);

    expect(second.body).toEqual(first.body);
    expect(
      await integration.dataSource.query(
        'SELECT count(*)::int AS count FROM transacciones_mercado',
      ),
    ).toEqual([{ count: 1 }]);
    expect(
      await integration.dataSource.query(
        'SELECT count(*)::int AS count FROM tokens WHERE id_usuario_owner = $1',
        [IDS.buyer],
      ),
    ).toEqual([{ count: 3 }]);
  });

  it('rechaza reutilizar la clave con otro payload', async () => {
    const app = integration.app.getHttpServer();
    await request(app)
      .post('/orders/buy')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'buy-conflict')
      .send({ idJugador: IDS.player, cantidadTokens: 2 })
      .expect(201);
    await request(app)
      .post('/orders/buy')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'buy-conflict')
      .send({ idJugador: IDS.player, cantidadTokens: 3 })
      .expect(409);
    expect(
      await integration.dataSource.query(
        'SELECT count(*)::int AS count FROM tokens WHERE id_usuario_owner = $1',
        [IDS.buyer],
      ),
    ).toEqual([{ count: 2 }]);
  });

  it('serializa compras concurrentes y conserva los 100 tokens', async () => {
    const concurrentPurchases = 20;
    await integration.dataSource.query(
      'UPDATE saldos_usuario SET creditos_disponibles = 200000 WHERE id_usuario = $1',
      [IDS.buyer],
    );
    const responses = await Promise.all(
      Array.from({ length: concurrentPurchases }, (_, index) =>
        request(integration.app.getHttpServer())
          .post('/orders/buy')
          .set('Authorization', `Bearer ${token}`)
          .set('Idempotency-Key', `buy-concurrent-${index}`)
          .send({ idJugador: IDS.player, cantidadTokens: 1 }),
      ),
    );
    expect(responses.every((response) => response.status === 201)).toBe(true);
    const owners = await integration.dataSource.query(
      `SELECT id_usuario_owner, count(*)::int AS cantidad
       FROM tokens WHERE id_jugador = $1 GROUP BY id_usuario_owner`,
      [IDS.player],
    );
    expect(
      owners.find(
        (row: { id_usuario_owner: string }) =>
          row.id_usuario_owner === IDS.buyer,
      )?.cantidad,
    ).toBe(concurrentPurchases);
    expect(
      owners.find(
        (row: { id_usuario_owner: string }) =>
          row.id_usuario_owner === IDS.admin,
      )?.cantidad,
    ).toBe(100 - concurrentPurchases);
    expect(
      owners.reduce(
        (sum: number, row: { cantidad: number }) => sum + row.cantidad,
        0,
      ),
    ).toBe(100);
    const [balance] = await integration.dataSource.query(
      'SELECT creditos_disponibles FROM saldos_usuario WHERE id_usuario = $1',
      [IDS.buyer],
    );
    expect(BigInt(balance.creditos_disponibles)).toBe(175320n);
  });

  it('revierte todo si la auditoría no puede persistirse', async () => {
    await integration.dataSource.query(`
      CREATE FUNCTION rechazar_auditoria_orden_prueba() RETURNS trigger AS $$
      BEGIN RAISE EXCEPTION 'fallo de auditoria'; END;
      $$ LANGUAGE plpgsql
    `);
    await integration.dataSource.query(`
      CREATE TRIGGER trg_rechazar_auditoria_orden_prueba
      BEFORE INSERT ON auditorias_transaccion
      FOR EACH ROW EXECUTE FUNCTION rechazar_auditoria_orden_prueba()
    `);
    try {
      await request(integration.app.getHttpServer())
        .post('/orders/buy')
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', 'buy-rollback')
        .send({ idJugador: IDS.player, cantidadTokens: 2 })
        .expect(500);
    } finally {
      await integration.dataSource.query(
        'DROP TRIGGER IF EXISTS trg_rechazar_auditoria_orden_prueba ON auditorias_transaccion',
      );
      await integration.dataSource.query(
        'DROP FUNCTION IF EXISTS rechazar_auditoria_orden_prueba()',
      );
    }
    expect(
      await integration.dataSource.query(
        'SELECT creditos_disponibles FROM saldos_usuario WHERE id_usuario = $1',
        [IDS.buyer],
      ),
    ).toEqual([{ creditos_disponibles: '100000' }]);
    expect(
      await integration.dataSource.query(
        'SELECT count(*)::int AS count FROM tokens WHERE id_usuario_owner = $1',
        [IDS.buyer],
      ),
    ).toEqual([{ count: 0 }]);
    expect(
      await integration.dataSource.query(
        'SELECT count(*)::int AS count FROM transacciones_mercado',
      ),
    ).toEqual([{ count: 0 }]);
  });

  it('traduce autenticación, autorización, request, quote, saldo y disponibilidad', async () => {
    const app = integration.app.getHttpServer();
    await request(app)
      .post('/orders/buy')
      .set('Idempotency-Key', 'invalid-auth')
      .send({ idJugador: IDS.player, cantidadTokens: 1 })
      .expect(401);
    await request(app)
      .post('/orders/buy')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Idempotency-Key', 'invalid-buyer')
      .send({ idJugador: IDS.player, cantidadTokens: 1 })
      .expect(403);
    await request(app)
      .post('/orders/buy')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'missing-player')
      .send({
        idJugador: '00000000-0000-4000-8000-000000000010',
        cantidadTokens: 1,
      })
      .expect(404);
    await request(app)
      .post('/orders/buy')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'invalid-quantity')
      .send({ idJugador: IDS.player, cantidadTokens: 0 })
      .expect(422);

    await integration.dataSource.query(
      `UPDATE recalculo_cotizacion_activo
       SET id_recalculo = NULL, tipo_estrategia = NULL WHERE id = 1`,
    );
    await request(app)
      .post('/orders/buy')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'missing-quote')
      .send({ idJugador: IDS.player, cantidadTokens: 1 })
      .expect(409);
    await integration.dataSource.query(
      `UPDATE recalculo_cotizacion_activo
       SET id_recalculo = $1, tipo_estrategia = 'ataque_decisivo' WHERE id = 1`,
      [IDS.recalc],
    );
    await integration.dataSource.query(
      'UPDATE saldos_usuario SET creditos_disponibles = 0 WHERE id_usuario = $1',
      [IDS.buyer],
    );
    await request(app)
      .post('/orders/buy')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'missing-balance')
      .send({ idJugador: IDS.player, cantidadTokens: 1 })
      .expect(409);
  });
});

async function seedMarket(integration: OrdersIntegrationApp): Promise<void> {
  const db = integration.dataSource;
  await db.query(
    `INSERT INTO usuarios (id, correo, password_hash, rol)
     VALUES ($1, $2, 'hash-admin', 'superadmin'), ($3, $4, 'hash-buyer', 'usuario')`,
    [IDS.admin, integration.superadminEmail, IDS.buyer, 'buyer@example.com'],
  );
  await db.query(
    `INSERT INTO saldos_usuario (id_usuario, creditos_disponibles)
     VALUES ($1, 0), ($2, 100000)`,
    [IDS.admin, IDS.buyer],
  );
  await db.query(
    `INSERT INTO ligas (id, proveedor_id, codigo, nombre)
     VALUES ($1, 1, 'ORD', 'Orders League')`,
    [IDS.league],
  );
  await db.query(
    `INSERT INTO equipos (id, proveedor_id, liga_id, nombre)
     VALUES ($1, 2, $2, 'Orders FC')`,
    [IDS.team, IDS.league],
  );
  await db.query(
    `INSERT INTO jugadores (id, proveedor_id, equipo_id, nombre)
     VALUES ($1, 3, $2, 'Orders Player')`,
    [IDS.player, IDS.team],
  );
  await db.query(
    `INSERT INTO estadisticas_jugadores
      (id, id_jugador, goles, asistencias, tiros, pases_clave, regates,
       faltas_cometidas, rating_whoscored)
     VALUES ($1, $2, 1, 1, 1, 1, 1, 1, 7.0)`,
    [IDS.stats, IDS.player],
  );
  await db.query(
    `INSERT INTO versiones_estrategia_cotizacion
      (id, tipo_estrategia, numero_version, pesos)
     VALUES ($1, 'ataque_decisivo', 1, '{}'::jsonb)`,
    [IDS.version],
  );
  await db.query(
    `INSERT INTO recalculos_cotizacion
      (id, id_version_estrategia, fecha_inicio, fecha_fin, jugadores_cotizados)
     VALUES ($1, $2, now(), now(), 1)`,
    [IDS.recalc, IDS.version],
  );
  await db.query(
    `UPDATE recalculo_cotizacion_activo
     SET id_recalculo = $1, tipo_estrategia = 'ataque_decisivo', actualizado_en = now()
     WHERE id = 1`,
    [IDS.recalc],
  );
  await db.query(
    `INSERT INTO cotizacion_vigente
      (id_jugador, tipo_estrategia, cotizacion, fecha_hora,
       id_version_estrategia, id_recalculo, id_estadistica)
     VALUES ($1, 'ataque_decisivo', '12.34', now(), $2, $3, $4)`,
    [IDS.player, IDS.version, IDS.recalc, IDS.stats],
  );
  const tokens = Array.from({ length: 100 }, (_, index) => [
    randomUUID(),
    IDS.player,
    IDS.admin,
    index + 1,
    '00000000-0000-4000-8000-000000000099',
  ]);
  for (const token of tokens)
    await db.query(
      `INSERT INTO tokens (id_token, id_jugador, id_usuario_owner,
       numero_emision, id_lote_emision)
       VALUES ($1, $2, $3, $4, $5)`,
      token,
    );
  await db.query(
    `INSERT INTO tenencias_jugador (id_tenencia, id_usuario, id_jugador, cantidad_tokens)
     VALUES ($1, $2, $3, 100)`,
    [randomUUID(), IDS.admin, IDS.player],
  );
}
