import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import type { OrdersIntegrationApp } from '../orders/orders-integration-app';

export const TRANSACTION_IDS = {
  league: '60000000-0000-4000-8000-000000000001',
  team: '60000000-0000-4000-8000-000000000002',
  player: '60000000-0000-4000-8000-000000000003',
  version: '60000000-0000-4000-8000-000000000004',
  recalculation: '60000000-0000-4000-8000-000000000005',
};

let emailSequence = 0;

export interface RegisteredTransactionUser {
  id: string;
  token: string;
}

export async function registerTransactionUser(
  app: INestApplication,
  prefix = 'transactions',
): Promise<RegisteredTransactionUser> {
  emailSequence += 1;
  const correo = `${prefix}-${emailSequence}@example.com`;
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

export async function seedTransactionReferenceData(
  integration: OrdersIntegrationApp,
): Promise<void> {
  const { dataSource } = integration;
  await dataSource.query(
    `INSERT INTO ligas (id, proveedor_id, codigo, nombre)
     VALUES ($1, 6001, 'TL', 'Liga de transacciones')`,
    [TRANSACTION_IDS.league],
  );
  await dataSource.query(
    `INSERT INTO equipos (id, proveedor_id, liga_id, nombre)
     VALUES ($1, 6002, $2, 'Equipo de transacciones')`,
    [TRANSACTION_IDS.team, TRANSACTION_IDS.league],
  );
  await dataSource.query(
    `INSERT INTO jugadores (id, proveedor_id, equipo_id, nombre, nombre_completo)
     VALUES ($1, 6003, $2, 'Jugador de transacciones', 'Jugador de transacciones completo')`,
    [TRANSACTION_IDS.player, TRANSACTION_IDS.team],
  );
  await dataSource.query(
    `INSERT INTO versiones_estrategia_cotizacion (
       id, tipo_estrategia, numero_version, pesos
     ) VALUES ($1, 'ataque_decisivo', 1, '{}'::jsonb)`,
    [TRANSACTION_IDS.version],
  );
  await dataSource.query(
    `INSERT INTO recalculos_cotizacion (
       id, id_version_estrategia, fecha_inicio, fecha_fin, jugadores_cotizados
     ) VALUES ($1, $2, $3, $3, 1)`,
    [
      TRANSACTION_IDS.recalculation,
      TRANSACTION_IDS.version,
      '2026-10-31T00:00:00.000Z',
    ],
  );
}

export interface TransactionSeed {
  idOperacion: string;
  tipo: 'COMPRA' | 'VENTA';
  compradorId: string;
  vendedorId: string;
  cantidadTokens: number;
  cotizacion: string;
  importeCreditos: bigint;
  fechaHora: string;
}

export async function insertTransaction(
  integration: OrdersIntegrationApp,
  seed: TransactionSeed,
): Promise<void> {
  await integration.dataSource.query(
    `INSERT INTO transacciones_mercado (
       id_operacion, tipo, clave_idempotencia, id_usuario_comprador,
       id_usuario_vendedor, id_jugador, cantidad_tokens, cotizacion,
       importe_creditos, tipo_estrategia, id_version_estrategia,
       id_recalculo, fecha_hora
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,
               'ataque_decisivo', $10, $11, $12)`,
    [
      seed.idOperacion,
      seed.tipo,
      `transactions-${seed.idOperacion}`,
      seed.compradorId,
      seed.vendedorId,
      TRANSACTION_IDS.player,
      seed.cantidadTokens,
      seed.cotizacion,
      seed.importeCreditos,
      TRANSACTION_IDS.version,
      TRANSACTION_IDS.recalculation,
      seed.fechaHora,
    ],
  );
}

export async function snapshotReadOnlyTables(
  integration: OrdersIntegrationApp,
): Promise<string> {
  const snapshot: unknown[] = [];
  for (const table of [
    'transacciones_mercado',
    'auditorias_transaccion',
    'saldos_usuario',
    'tokens',
    'tenencias_jugador',
    'cotizacion_vigente',
    'historial_cotizacion',
  ]) {
    snapshot.push(
      await integration.dataSource.query(`SELECT * FROM ${table} ORDER BY 1`),
    );
  }
  return JSON.stringify(snapshot);
}
