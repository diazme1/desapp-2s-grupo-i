import { randomUUID } from 'node:crypto';
import { EstrategiaCotizacion } from '../../../src/players/domain/estrategia-cotizacion';
import type { OrdersIntegrationApp } from './orders-integration-app';

export const SELL_IDS = {
  admin: '20000000-0000-4000-8000-000000000001',
  seller: '20000000-0000-4000-8000-000000000002',
  player: '20000000-0000-4000-8000-000000000003',
  team: '20000000-0000-4000-8000-000000000004',
  league: '20000000-0000-4000-8000-000000000005',
  stats: '20000000-0000-4000-8000-000000000006',
  version: '20000000-0000-4000-8000-000000000007',
  recalc: '20000000-0000-4000-8000-000000000008',
};

export interface SellMarketSeedOptions {
  sellerBalance?: string;
  superadminBalance?: string | null;
}

export async function seedSellMarket(
  integration: OrdersIntegrationApp,
  options: SellMarketSeedOptions = {},
): Promise<void> {
  const db = integration.dataSource;
  const sellerBalance = options.sellerBalance ?? '100000';
  await db.query(
    `INSERT INTO usuarios (id, correo, password_hash, rol)
     VALUES ($1, $2, 'hash-admin', 'superadmin'),
            ($3, 'seller@example.com', 'hash-seller', 'usuario')`,
    [SELL_IDS.admin, integration.superadminEmail, SELL_IDS.seller],
  );
  if (options.superadminBalance !== null) {
    await db.query(
      `INSERT INTO saldos_usuario (id_usuario, creditos_disponibles)
       VALUES ($1, $2), ($3, $4)`,
      [
        SELL_IDS.admin,
        options.superadminBalance ?? '0',
        SELL_IDS.seller,
        sellerBalance,
      ],
    );
  } else {
    await db.query(
      `INSERT INTO saldos_usuario (id_usuario, creditos_disponibles)
       VALUES ($1, $2)`,
      [SELL_IDS.seller, sellerBalance],
    );
  }
  await db.query(
    `INSERT INTO ligas (id, proveedor_id, codigo, nombre)
     VALUES ($1, 21, 'SEL', 'Sell League')`,
    [SELL_IDS.league],
  );
  await db.query(
    `INSERT INTO equipos (id, proveedor_id, liga_id, nombre)
     VALUES ($1, 22, $2, 'Sell FC')`,
    [SELL_IDS.team, SELL_IDS.league],
  );
  await db.query(
    `INSERT INTO jugadores (id, proveedor_id, equipo_id, nombre)
     VALUES ($1, 23, $2, 'Sell Player')`,
    [SELL_IDS.player, SELL_IDS.team],
  );
  await db.query(
    `INSERT INTO estadisticas_jugadores
      (id, id_jugador, goles, asistencias, tiros, pases_clave, regates,
       faltas_cometidas, rating_whoscored)
     VALUES ($1, $2, 1, 1, 1, 1, 1, 1, 7.0)`,
    [SELL_IDS.stats, SELL_IDS.player],
  );
  await db.query(
    `INSERT INTO versiones_estrategia_cotizacion
      (id, tipo_estrategia, numero_version, pesos)
     VALUES ($1, 'ataque_decisivo', 1, $2::jsonb)`,
    [
      SELL_IDS.version,
      JSON.stringify(
        EstrategiaCotizacion.versionInicial('ataque_decisivo').pesos,
      ),
    ],
  );
  await db.query(
    `INSERT INTO recalculos_cotizacion
      (id, id_version_estrategia, fecha_inicio, fecha_fin, jugadores_cotizados)
     VALUES ($1, $2, now(), now(), 1)`,
    [SELL_IDS.recalc, SELL_IDS.version],
  );
  await db.query(
    `UPDATE recalculo_cotizacion_activo
     SET id_recalculo = $1, tipo_estrategia = 'ataque_decisivo', actualizado_en = now()
     WHERE id = 1`,
    [SELL_IDS.recalc],
  );
  await db.query(
    `INSERT INTO cotizacion_vigente
      (id_jugador, tipo_estrategia, cotizacion, fecha_hora,
       id_version_estrategia, id_recalculo, id_estadistica)
     VALUES ($1, 'ataque_decisivo', '12.34', now(), $2, $3, $4)`,
    [SELL_IDS.player, SELL_IDS.version, SELL_IDS.recalc, SELL_IDS.stats],
  );
  for (let numeroEmision = 1; numeroEmision <= 100; numeroEmision += 1) {
    await db.query(
      `INSERT INTO tokens
        (id_token, id_jugador, id_usuario_owner, numero_emision, id_lote_emision)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        randomUUID(),
        SELL_IDS.player,
        SELL_IDS.seller,
        numeroEmision,
        '20000000-0000-4000-8000-000000000099',
      ],
    );
  }
  await db.query(
    `INSERT INTO tenencias_jugador
      (id_tenencia, id_usuario, id_jugador, cantidad_tokens)
     VALUES ($1, $2, $3, 100)`,
    [randomUUID(), SELL_IDS.seller, SELL_IDS.player],
  );
}
