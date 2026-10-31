import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { JwtTokenService } from '../../../src/auth/strategies/jwt-token.service';
import {
  createOrdersIntegrationApp,
  type OrdersIntegrationApp,
} from '../orders/orders-integration-app';

const IDS = {
  league: '10000000-0000-4000-8000-000000000001',
  team: '10000000-0000-4000-8000-000000000002',
  player: '10000000-0000-4000-8000-000000000003',
  statistic: '10000000-0000-4000-8000-000000000004',
  version: '10000000-0000-4000-8000-000000000005',
  recalculation: '10000000-0000-4000-8000-000000000006',
  seller: '10000000-0000-4000-8000-000000000007',
  lot: '10000000-0000-4000-8000-000000000008',
  history: '10000000-0000-4000-8000-000000000009',
};

let emailSequence = 0;

describe('GET /users/:id/portfolio', () => {
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

  it('permite el acceso propio y calcula usando la cotización vigente', async () => {
    const user = await registerUser(app);
    await seedPortfolio(integration, user.id, {
      cotizacionVigente: '15.00',
      historialCotizacion: '99.99',
      compras: [
        { cantidadTokens: 1, cotizacion: '10.00' },
        { cantidadTokens: 1, cotizacion: '12.00' },
      ],
    });

    const response = await request(app.getHttpServer())
      .get(`/users/${user.id}/portfolio`)
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);

    expect(response.body).toEqual({
      usuarioId: user.id,
      posiciones: [
        {
          idJugador: IDS.player,
          cantidadTokens: 2,
          cotizacionVigente: '15.00',
          precioPromedioCompra: '11.00',
          valorActual: '30.00',
          gananciaPerdida: '8.00',
        },
      ],
    });
  });

  it('devuelve un portfolio vacío sin tenencias positivas', async () => {
    const user = await registerUser(app);

    const response = await request(app.getHttpServer())
      .get(`/users/${user.id}/portfolio`)
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);

    expect(response.body).toEqual({ usuarioId: user.id, posiciones: [] });
  });

  it('rechaza el acceso a un UUID ajeno aunque no exista', async () => {
    const user = await registerUser(app);
    const foreignId = '20000000-0000-4000-8000-000000000001';

    await request(app.getHttpServer())
      .get(`/users/${foreignId}/portfolio`)
      .set('Authorization', `Bearer ${user.token}`)
      .expect(403);
  });

  it('devuelve 404 para el UUID propio cuando el usuario no existe', async () => {
    const missingId = '20000000-0000-4000-8000-000000000002';
    const tokenService = app.get(JwtTokenService);
    const token = tokenService.sign({
      sub: missingId,
      correo: 'missing@example.com',
    });

    await request(app.getHttpServer())
      .get(`/users/${missingId}/portfolio`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('devuelve 401 sin JWT y 422 para un UUID inválido', async () => {
    const user = await registerUser(app);

    await request(app.getHttpServer())
      .get('/users/not-a-uuid/portfolio')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(422);
    await request(app.getHttpServer())
      .get(`/users/${user.id}/portfolio`)
      .expect(401);
  });

  it('devuelve 409 si falta la cotización vigente', async () => {
    const user = await registerUser(app);
    await seedPortfolio(integration, user.id, { incluirCotizacion: false });

    const response = await request(app.getHttpServer())
      .get(`/users/${user.id}/portfolio`)
      .set('Authorization', `Bearer ${user.token}`)
      .expect(409);

    expect(response.body).not.toHaveProperty('posiciones');
  });

  it('devuelve 409 si la tenencia no coincide con sus tokens', async () => {
    const user = await registerUser(app);
    await seedPortfolio(integration, user.id, {
      cantidadTokensIndividuales: 1,
    });

    const response = await request(app.getHttpServer())
      .get(`/users/${user.id}/portfolio`)
      .set('Authorization', `Bearer ${user.token}`)
      .expect(409);

    expect(response.body).not.toHaveProperty('posiciones');
  });

  it('ignora ventas y conserva null cuando no existen compras', async () => {
    const user = await registerUser(app);
    await seedPortfolio(integration, user.id, {
      compras: [],
      ventas: [{ cantidadTokens: 1, cotizacion: '20.00' }],
    });

    const response = await request(app.getHttpServer())
      .get(`/users/${user.id}/portfolio`)
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);

    expect(response.body.posiciones[0]).toMatchObject({
      precioPromedioCompra: null,
      gananciaPerdida: null,
      valorActual: '30.00',
    });
  });

  it('no produce escrituras en las tablas consultadas', async () => {
    const user = await registerUser(app);
    await seedPortfolio(integration, user.id);
    const before = await snapshotMarketData(integration);

    await request(app.getHttpServer())
      .get(`/users/${user.id}/portfolio`)
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);

    const after = await snapshotMarketData(integration);
    expect(after).toBe(before);
  });
});

async function registerUser(
  app: INestApplication,
): Promise<{ id: string; token: string }> {
  emailSequence += 1;
  const correo = `portfolio-${emailSequence}@example.com`;
  const registered = await request(app.getHttpServer())
    .post('/auth/register')
    .send({ correo, password: 'secret123' })
    .expect(201);
  const login = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ correo, password: 'secret123' })
    .expect(200);
  return { id: registered.body.id, token: login.body.accessToken };
}

interface SeedOptions {
  cantidadTenencia?: number;
  cantidadTokensIndividuales?: number;
  cotizacionVigente?: string;
  historialCotizacion?: string;
  incluirCotizacion?: boolean;
  compras?: Array<{ cantidadTokens: number; cotizacion: string }>;
  ventas?: Array<{ cantidadTokens: number; cotizacion: string }>;
}

async function seedPortfolio(
  integration: OrdersIntegrationApp,
  usuarioId: string,
  options: SeedOptions = {},
): Promise<void> {
  const cantidadTenencia = options.cantidadTenencia ?? 2;
  const cantidadTokensIndividuales =
    options.cantidadTokensIndividuales ?? cantidadTenencia;
  const compras = options.compras ?? [
    { cantidadTokens: 1, cotizacion: '10.00' },
    { cantidadTokens: 1, cotizacion: '12.00' },
  ];
  const ventas = options.ventas ?? [];
  const dataSource = integration.dataSource;

  await dataSource.query(
    `INSERT INTO ligas (id, proveedor_id, codigo, nombre)
     VALUES ($1, 1, 'PL', 'Premier League')`,
    [IDS.league],
  );
  await dataSource.query(
    `INSERT INTO equipos (id, proveedor_id, liga_id, nombre)
     VALUES ($1, 2, $2, 'Equipo de prueba')`,
    [IDS.team, IDS.league],
  );
  await dataSource.query(
    `INSERT INTO jugadores (id, proveedor_id, equipo_id, nombre)
     VALUES ($1, 3, $2, 'Jugador de prueba')`,
    [IDS.player, IDS.team],
  );
  await dataSource.query(
    `INSERT INTO estadisticas_jugadores (
       id, id_jugador, goles, asistencias, tiros, pases_clave, regates,
       faltas_cometidas, rating_whoscored, fecha_captura
     ) VALUES ($1, $2, 1, 1, 1, 1, 1, 1, 7.5, now())`,
    [IDS.statistic, IDS.player],
  );
  await dataSource.query(
    `INSERT INTO versiones_estrategia_cotizacion (
       id, tipo_estrategia, numero_version, pesos
     ) VALUES ($1, 'ataque_decisivo', 1, '{}'::jsonb)`,
    [IDS.version],
  );
  await dataSource.query(
    `INSERT INTO recalculos_cotizacion (
       id, id_version_estrategia, fecha_inicio, fecha_fin, jugadores_cotizados
     ) VALUES ($1, $2, now(), now(), 1)`,
    [IDS.recalculation, IDS.version],
  );
  await dataSource.query(
    `UPDATE recalculo_cotizacion_activo
     SET id_recalculo = $1, tipo_estrategia = 'ataque_decisivo'
     WHERE id = 1`,
    [IDS.recalculation],
  );
  if (options.incluirCotizacion !== false) {
    await dataSource.query(
      `INSERT INTO cotizacion_vigente (
         id_jugador, cotizacion, fecha_hora, tipo_estrategia,
         id_version_estrategia, id_recalculo, id_estadistica
       ) VALUES ($1, $2, now(), 'ataque_decisivo', $3, $4, $5)`,
      [
        IDS.player,
        options.cotizacionVigente ?? '15.00',
        IDS.version,
        IDS.recalculation,
        IDS.statistic,
      ],
    );
  }
  await dataSource.query(
    `INSERT INTO historial_cotizacion (
       id, id_jugador, fecha_hora, cotizacion, tipo_estrategia,
       id_version_estrategia, id_recalculo, id_estadistica
     ) VALUES ($1, $2, now(), $3, 'ataque_decisivo', $4, $5, $6)`,
    [
      IDS.history,
      IDS.player,
      options.historialCotizacion ?? '13.00',
      IDS.version,
      IDS.recalculation,
      IDS.statistic,
    ],
  );
  await dataSource.query(
    `INSERT INTO usuarios (id, correo, password_hash, rol)
     VALUES ($1, 'portfolio-seller@example.com', 'not-used', 'superadmin')`,
    [IDS.seller],
  );

  if (cantidadTenencia > 0) {
    await dataSource.query(
      `INSERT INTO tenencias_jugador (
         id_tenencia, id_usuario, id_jugador, cantidad_tokens
       ) VALUES ($1, $2, $3, $4)`,
      [
        '30000000-0000-4000-8000-000000000001',
        usuarioId,
        IDS.player,
        cantidadTenencia,
      ],
    );
  }
  for (
    let numeroEmision = 1;
    numeroEmision <= cantidadTokensIndividuales;
    numeroEmision += 1
  ) {
    await dataSource.query(
      `INSERT INTO tokens (
         id_token, id_jugador, id_usuario_owner, numero_emision, id_lote_emision
       ) VALUES ($1, $2, $3, $4, $5)`,
      [
        `30000000-0000-4000-8000-${String(numeroEmision).padStart(12, '0')}`,
        IDS.player,
        usuarioId,
        numeroEmision,
        IDS.lot,
      ],
    );
  }
  for (let index = 0; index < compras.length; index += 1) {
    const compra = compras[index];
    await dataSource.query(
      `INSERT INTO transacciones_mercado (
         id_operacion, tipo, clave_idempotencia, id_usuario_comprador,
         id_usuario_vendedor, id_jugador, cantidad_tokens, cotizacion,
         importe_creditos, tipo_estrategia, id_version_estrategia,
         id_recalculo, fecha_hora
       ) VALUES ($1, 'COMPRA', $2, $3, $4, $5, $6, $7, $8,
                 'ataque_decisivo', $9, $10, now())`,
      [
        `40000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
        `portfolio-buy-${index + 1}`,
        usuarioId,
        IDS.seller,
        IDS.player,
        compra.cantidadTokens,
        compra.cotizacion,
        BigInt(compra.cantidadTokens) *
          BigInt(compra.cotizacion.replace('.', '')),
        IDS.version,
        IDS.recalculation,
      ],
    );
  }
  for (let index = 0; index < ventas.length; index += 1) {
    const venta = ventas[index];
    await dataSource.query(
      `INSERT INTO transacciones_mercado (
         id_operacion, tipo, clave_idempotencia, id_usuario_comprador,
         id_usuario_vendedor, id_jugador, cantidad_tokens, cotizacion,
         importe_creditos, tipo_estrategia, id_version_estrategia,
         id_recalculo, fecha_hora
       ) VALUES ($1, 'VENTA', $2, $3, $4, $5, $6, $7, $8,
                 'ataque_decisivo', $9, $10, now())`,
      [
        `50000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
        `portfolio-sell-${index + 1}`,
        IDS.seller,
        usuarioId,
        IDS.player,
        venta.cantidadTokens,
        venta.cotizacion,
        BigInt(venta.cantidadTokens) *
          BigInt(venta.cotizacion.replace('.', '')),
        IDS.version,
        IDS.recalculation,
      ],
    );
  }
}

async function snapshotMarketData(
  integration: OrdersIntegrationApp,
): Promise<string> {
  const tables = [
    'tokens',
    'tenencias_jugador',
    'cotizacion_vigente',
    'transacciones_mercado',
  ];
  const snapshot = [];
  for (const table of tables) {
    const rows = await integration.dataSource.query(
      `SELECT * FROM ${table} ORDER BY 1, 2, 3`,
    );
    snapshot.push(rows);
  }
  return JSON.stringify(snapshot);
}
