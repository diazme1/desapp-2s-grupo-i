import { DataSource, EntityManager } from 'typeorm';
import { Cotizacion } from '../../market/domain/cotizacion';
import {
  PortfolioRepository,
  type PortfolioReadModel,
} from '../portfolio.repository';

export class TypeOrmPortfolioRepository implements PortfolioRepository {
  constructor(private readonly dataSource: DataSource) {}

  consultar(usuarioId: string): Promise<PortfolioReadModel> {
    return this.dataSource.transaction('REPEATABLE READ', async (manager) => {
      await manager.query('SET TRANSACTION READ ONLY');
      return this.consultarEnSnapshot(manager, usuarioId);
    });
  }

  private async consultarEnSnapshot(
    manager: EntityManager,
    usuarioId: string,
  ): Promise<PortfolioReadModel> {
    const usuarios = (await manager.query(
      'SELECT id FROM usuarios WHERE id = $1',
      [usuarioId],
    )) as Array<{ id: string }>;
    if (usuarios.length === 0) {
      return {
        usuarioId,
        usuarioExiste: false,
        tenencias: [],
        conteosTokens: [],
        cotizaciones: [],
        transacciones: [],
      };
    }

    const tenencias = (await manager.query(
      `SELECT id_jugador AS "jugadorId", cantidad_tokens AS "cantidadTokens"
       FROM tenencias_jugador
       WHERE id_usuario = $1 AND cantidad_tokens > 0
       ORDER BY id_jugador ASC`,
      [usuarioId],
    )) as Array<{ jugadorId: string; cantidadTokens: number | string }>;
    const jugadorIds = tenencias.map((tenencia) => tenencia.jugadorId);

    if (jugadorIds.length === 0) {
      return {
        usuarioId,
        usuarioExiste: true,
        tenencias: [],
        conteosTokens: [],
        cotizaciones: [],
        transacciones: [],
      };
    }

    const activo = (await manager.query(
      `SELECT id_recalculo AS "idRecalculo",
              tipo_estrategia AS "tipoEstrategia"
       FROM recalculo_cotizacion_activo
       WHERE id = 1`,
    )) as Array<{
      idRecalculo: string | null;
      tipoEstrategia: string | null;
    }>;
    const estrategiaActiva = activo[0] ?? null;

    const tokenRows = (await manager.query(
      `SELECT id_jugador AS "jugadorId", count(*)::int AS "cantidadTokens"
       FROM tokens
       WHERE id_usuario_owner = $1
         AND id_jugador = ANY($2::uuid[])
       GROUP BY id_jugador`,
      [usuarioId, jugadorIds],
    )) as Array<{ jugadorId: string; cantidadTokens: number | string }>;

    let cotizacionRows: Array<{ jugadorId: string; cotizacion: string }> = [];
    if (estrategiaActiva?.tipoEstrategia && estrategiaActiva.idRecalculo) {
      cotizacionRows = (await manager.query(
        `SELECT id_jugador AS "jugadorId", cotizacion::text AS cotizacion
         FROM cotizacion_vigente
         WHERE id_jugador = ANY($1::uuid[])
           AND tipo_estrategia = $2
           AND id_recalculo = $3`,
        [
          jugadorIds,
          estrategiaActiva.tipoEstrategia,
          estrategiaActiva.idRecalculo,
        ],
      )) as Array<{ jugadorId: string; cotizacion: string }>;
    }

    const transaccionRows = (await manager.query(
      `SELECT id_jugador AS "jugadorId", tipo,
              cantidad_tokens AS "cantidadTokens",
              cotizacion::text AS cotizacion
       FROM transacciones_mercado
       WHERE id_usuario_comprador = $1
         AND id_jugador = ANY($2::uuid[])
         AND tipo = 'COMPRA'`,
      [usuarioId, jugadorIds],
    )) as Array<{
      jugadorId: string;
      tipo: 'COMPRA' | 'VENTA';
      cantidadTokens: number | string;
      cotizacion: string;
    }>;

    return {
      usuarioId,
      usuarioExiste: true,
      tenencias: tenencias.map((tenencia) => ({
        jugadorId: tenencia.jugadorId,
        cantidadTokens: Number(tenencia.cantidadTokens),
      })),
      conteosTokens: tokenRows.map((row) => ({
        jugadorId: row.jugadorId,
        cantidadTokens: Number(row.cantidadTokens),
      })),
      cotizaciones: cotizacionRows.map((row) => ({
        jugadorId: row.jugadorId,
        cotizacion: Cotizacion.fromDecimal(row.cotizacion),
      })),
      transacciones: transaccionRows.map((row) => ({
        jugadorId: row.jugadorId,
        tipo: row.tipo,
        cantidadTokens: Number(row.cantidadTokens),
        cotizacion: Cotizacion.fromDecimal(row.cotizacion),
      })),
    };
  }
}
