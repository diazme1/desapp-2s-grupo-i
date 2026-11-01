import { DataSource, EntityManager } from 'typeorm';
import type {
  TransactionHistoryRow,
  TransactionsReadModel,
  TransactionsRepository,
} from '../transactions.repository';

export class TypeOrmTransactionsRepository implements TransactionsRepository {
  constructor(private readonly dataSource: DataSource) {}

  consultar(usuarioId: string): Promise<TransactionsReadModel> {
    return this.dataSource.transaction('REPEATABLE READ', async (manager) => {
      await manager.query('SET TRANSACTION READ ONLY');
      return this.consultarEnSnapshot(manager, usuarioId);
    });
  }

  private async consultarEnSnapshot(
    manager: EntityManager,
    usuarioId: string,
  ): Promise<TransactionsReadModel> {
    const usuarios = (await manager.query(
      'SELECT id FROM usuarios WHERE id = $1',
      [usuarioId],
    )) as Array<{ id: string }>;
    if (usuarios.length === 0) {
      return { usuarioId, usuarioExiste: false, operaciones: [] };
    }

    const rows = (await manager.query(
      `SELECT id_operacion AS "idOperacion",
              tipo,
              id_jugador AS "jugadorId",
              jugador.nombre_completo AS "nombreCompleto",
              cantidad_tokens AS "cantidadTokens",
              cotizacion::text AS cotizacion,
              importe_creditos AS "importeCreditos",
              fecha_hora AS "fechaHora"
       FROM transacciones_mercado transaccion
       INNER JOIN jugadores jugador ON jugador.id = transaccion.id_jugador
       WHERE transaccion.id_usuario_comprador = $1
          OR transaccion.id_usuario_vendedor = $1
       ORDER BY transaccion.fecha_hora DESC, transaccion.id_operacion ASC`,
      [usuarioId],
    )) as Array<{
      idOperacion: string;
      tipo: TransactionHistoryRow['tipo'];
      jugadorId: string;
      nombreCompleto: string | null;
      cantidadTokens: number | string;
      cotizacion: string;
      importeCreditos: bigint | string | number;
      fechaHora: Date;
    }>;

    return {
      usuarioId,
      usuarioExiste: true,
      operaciones: rows.map((row) => ({
        idOperacion: row.idOperacion,
        tipo: row.tipo,
        jugadorId: row.jugadorId,
        nombreCompleto: row.nombreCompleto,
        cantidadTokens: Number(row.cantidadTokens),
        cotizacion: row.cotizacion,
        importeCreditos: BigInt(row.importeCreditos),
        fechaHora: row.fechaHora,
      })),
    };
  }
}
