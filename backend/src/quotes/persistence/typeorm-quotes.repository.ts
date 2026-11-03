import { randomUUID } from 'node:crypto';
import { DataSource, EntityManager } from 'typeorm';
import type { QuoteHistoryRepository } from '../quotes.repository';
import type {
  QuoteRecalculationRepository,
  QuoteRecalculationUnitOfWork,
  CotizacionParaGuardar,
  CorridaCotizacionParaGuardar,
  EstadisticaParaRecalculo,
} from '../quote-recalculation.repository';
import type { TipoEstrategiaCotizacion, VersionEstrategiaCotizacion } from '../domain/estrategia-cotizacion';
import type { QuoteRankingRepository, RankingCotizaciones } from '../quote-ranking.repository';
import { JugadorEntity } from '../../players/persistence/jugador.entity';
import { HistorialCotizacionEntity } from './historial-cotizacion.entity';
import { VersionEstrategiaCotizacionEntity } from './version-estrategia-cotizacion.entity';
import { RecalculoCotizacionEntity } from './recalculo-cotizacion.entity';

export class TypeOrmQuotesRepository
  implements QuoteHistoryRepository, QuoteRecalculationRepository, QuoteRankingRepository
{
  constructor(private readonly dataSource: DataSource) {}
  async listarHistorialJugador(jugadorId: string, page: number, limit: number) {
    const player = await this.dataSource.getRepository(JugadorEntity).findOne({
      select: { id: true },
      where: { id: jugadorId },
    });
    if (!player) return null;

    const [entities, total] = await this.dataSource
      .getRepository(HistorialCotizacionEntity)
      .findAndCount({
        where: { jugador: { id: jugadorId } },
        relations: { estadistica: true },
        order: { fechaHora: 'DESC', id: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });
    return {
      items: entities.map((entity) => ({
        id: entity.id,
        jugadorId,
        fechaHora: entity.fechaHora,
        // PostgreSQL rows are transformed to Cotizacion. The numeric branch
        // exists only for legacy unit fixtures and does not enter writes or
        // financial calculations.
        cotizacion: entity.cotizacion,
        tipoEstrategia: entity.tipoEstrategia,
        idVersionEstrategia: entity.idVersionEstrategia,
        idRecalculo: entity.idRecalculo,
        idEstadistica: entity.estadistica?.id ?? null,
      })),
      total,
    };
  }

  async listarRanking(
    estrategiaSolicitada?: TipoEstrategiaCotizacion,
  ): Promise<RankingCotizaciones> {
    const [activo] = (await this.dataSource.query(`
      SELECT id_recalculo AS "idRecalculo",
             tipo_estrategia AS "tipoEstrategia"
      FROM recalculo_cotizacion_activo
      WHERE id = 1
    `)) as Array<{ idRecalculo: string | null; tipoEstrategia: string | null }>;
    const estrategia =
      estrategiaSolicitada ??
      (activo?.tipoEstrategia as TipoEstrategiaCotizacion | null | undefined) ??
      null;

    if (!estrategia) {
      return {
        estrategia: null,
        idRecalculo: null,
        fechaHora: null,
        jugadores: [],
      };
    }

    let corrida: { id: string; fechaHora: Date } | undefined;
    if (activo?.tipoEstrategia === estrategia && activo.idRecalculo) {
      [corrida] = (await this.dataSource.query(
        `SELECT id, fecha_fin AS "fechaHora"
         FROM recalculos_cotizacion WHERE id = $1`,
        [activo.idRecalculo],
      )) as Array<{ id: string; fechaHora: Date }>;
    } else {
      [corrida] = (await this.dataSource.query(
        `SELECT recalculo.id, recalculo.fecha_fin AS "fechaHora"
         FROM recalculos_cotizacion recalculo
         JOIN versiones_estrategia_cotizacion version
           ON version.id = recalculo.id_version_estrategia
         WHERE version.tipo_estrategia = $1
         ORDER BY recalculo.fecha_fin DESC, recalculo.id DESC
         LIMIT 1`,
        [estrategia],
      )) as Array<{ id: string; fechaHora: Date }>;
    }

    if (!corrida) {
      return {
        estrategia,
        idRecalculo: null,
        fechaHora: null,
        jugadores: [],
      };
    }

    const jugadores = (await this.dataSource.query(
      `SELECT jugador.id,
              jugador.nombre,
              equipo.nombre AS equipo,
              liga.codigo AS liga,
              vigente.cotizacion,
              COALESCE((
                SELECT COUNT(*)::integer
                FROM tokens token
                JOIN usuarios propietario ON propietario.id = token.id_usuario_owner
                WHERE token.id_jugador = jugador.id AND propietario.rol = 'superadmin'
              ), 0) AS "tokensDisponibles"
       FROM cotizacion_vigente vigente
       JOIN jugadores jugador ON jugador.id = vigente.id_jugador
       JOIN equipos equipo ON equipo.id = jugador.equipo_id
       JOIN ligas liga ON liga.id = equipo.liga_id
       WHERE vigente.tipo_estrategia = $1
         AND vigente.id_recalculo = $2
       ORDER BY vigente.cotizacion DESC, jugador.nombre ASC, jugador.id ASC`,
      [estrategia, corrida.id],
    )) as Array<{
      id: string;
      nombre: string;
      equipo: string;
      liga: string;
      cotizacion: string | number;
      tokensDisponibles: number;
    }>;

    return {
      estrategia,
      idRecalculo: corrida.id,
      fechaHora: corrida.fechaHora,
      jugadores: jugadores.map((jugador) => ({
        ...jugador,
        cotizacion: Number(jugador.cotizacion),
        tokensDisponibles: Number(jugador.tokensDisponibles),
      })),
    };
  }

  async ejecutarEnTransaccion<T>(
    operacion: (unitOfWork: QuoteRecalculationUnitOfWork) => Promise<T>,
  ): Promise<T> {
    return this.dataSource.transaction(async (manager) => {
      await manager.query(
        'SELECT id FROM recalculo_cotizacion_activo WHERE id = 1 FOR UPDATE',
      );

      const unitOfWork: QuoteRecalculationUnitOfWork = {
        contarJugadores: () => manager.getRepository(JugadorEntity).count(),
        listarUltimasEstadisticas: async () => {
          const rows = (await manager.query(`
            SELECT DISTINCT ON (id_jugador)
              id AS "idEstadistica",
              id_jugador AS "idJugador",
              goles,
              asistencias,
              tiros,
              pases_clave AS "pasesClave",
              regates,
              faltas_cometidas AS "faltasCometidas",
              rating_whoscored AS "ratingWhoScored"
            FROM estadisticas_jugadores
            ORDER BY id_jugador ASC, fecha_captura DESC, id DESC
          `)) as Record<string, unknown>[];
          return rows.map(aEstadisticaParaRecalculo);
        },
        obtenerUltimaVersionEstrategia: async (tipo) => {
          const repository = manager.getRepository(
            VersionEstrategiaCotizacionEntity,
          );
          const entity = await repository.findOne({
            where: { tipoEstrategia: tipo },
            order: { numeroVersion: 'DESC' },
          });
          return entity ? mapearVersionEstrategia(entity) : null;
        },
        crearVersionEstrategia: async (input) => {
          const repository = manager.getRepository(
            VersionEstrategiaCotizacionEntity,
          );
          const entity = await repository.save(
            repository.create({
              id: randomUUID(),
              tipoEstrategia: input.tipo,
              numeroVersion: input.version,
              pesos: input.pesos,
            }),
          );
          return mapearVersionEstrategia(entity);
        },
        guardarCorrida: async (corrida: CorridaCotizacionParaGuardar) => {
          await manager.getRepository(RecalculoCotizacionEntity).save(
            manager.getRepository(RecalculoCotizacionEntity).create({
              id: corrida.id,
              versionEstrategia: { id: corrida.idVersionEstrategia },
              fechaInicio: corrida.fechaInicio,
              fechaFin: corrida.fechaFin,
              jugadoresCotizados: corrida.jugadoresCotizados,
            }),
          );
        },
        guardarCotizaciones: async (input) => {
          const tamanoLote = 250;
          for (
            let offset = 0;
            offset < input.cotizaciones.length;
            offset += tamanoLote
          ) {
            const lote = input.cotizaciones.slice(offset, offset + tamanoLote);
            await insertarCotizaciones(manager, input, lote);
            await actualizarCotizacionesVigentes(manager, input, lote);
          }
        },
        activarCorrida: async (
          idRecalculo: string,
          tipoEstrategia: TipoEstrategiaCotizacion,
          fechaHora: Date,
        ) => {
          await manager.query(
            `UPDATE recalculo_cotizacion_activo
             SET id_recalculo = $1, tipo_estrategia = $2, actualizado_en = $3
             WHERE id = 1`,
            [idRecalculo, tipoEstrategia, fechaHora],
          );
        },
      };

      return operacion(unitOfWork);
    });
  }

  async listarUltimasVersionesEstrategia(): Promise<VersionEstrategiaCotizacion[]> {
    const versiones = await this.dataSource
      .getRepository(VersionEstrategiaCotizacionEntity)
      .find({ order: { tipoEstrategia: 'ASC', numeroVersion: 'DESC' } });
    const ultimas = new Map<TipoEstrategiaCotizacion, VersionEstrategiaCotizacion>();
    for (const version of versiones) {
      if (!ultimas.has(version.tipoEstrategia)) {
        ultimas.set(version.tipoEstrategia, mapearVersionEstrategia(version));
      }
    }
    return [...ultimas.values()];
  }

}
function aEstadisticaParaRecalculo(
  row: Record<string, unknown>,
): EstadisticaParaRecalculo {
  return {
    idEstadistica: String(row.idEstadistica),
    idJugador: String(row.idJugador),
    goles: nullableNumber(row.goles),
    asistencias: nullableNumber(row.asistencias),
    tiros: nullableNumber(row.tiros),
    pasesClave: nullableNumber(row.pasesClave),
    regates: nullableNumber(row.regates),
    faltasCometidas: nullableNumber(row.faltasCometidas),
    ratingWhoScored: nullableNumber(row.ratingWhoScored),
  };
}

function mapearVersionEstrategia(
  entity: VersionEstrategiaCotizacionEntity,
): VersionEstrategiaCotizacion {
  return {
    id: entity.id,
    tipoEstrategia: entity.tipoEstrategia,
    numeroVersion: entity.numeroVersion,
    pesos: { ...entity.pesos },
  };
}

function nullableNumber(value: unknown): number | null {
  return value === null || value === undefined ? null : Number(value);
}

async function insertarCotizaciones(
  manager: EntityManager,
  corrida: {
    idRecalculo: string;
    idVersionEstrategia: string;
    tipoEstrategia: string;
    fechaHora: Date;
  },
  cotizaciones: CotizacionParaGuardar[],
): Promise<void> {
  if (cotizaciones.length === 0) return;

  const parametros: unknown[] = [];
  const valores = cotizaciones.map((cotizacion) => {
    const inicio = parametros.length + 1;
    parametros.push(
      randomUUID(),
      cotizacion.idJugador,
      corrida.fechaHora,
      cotizacion.cotizacion,
      corrida.tipoEstrategia,
      corrida.idVersionEstrategia,
      corrida.idRecalculo,
      cotizacion.idEstadistica,
    );
    return `(${Array.from({ length: 8 }, (_, indice) => `$${inicio + indice}`).join(', ')})`;
  });
  await manager.query(
    `INSERT INTO historial_cotizacion
      (id, id_jugador, fecha_hora, cotizacion, tipo_estrategia,
       id_version_estrategia, id_recalculo, id_estadistica)
     VALUES ${valores.join(', ')}`,
    parametros,
  );
}

async function actualizarCotizacionesVigentes(
  manager: EntityManager,
  corrida: {
    idRecalculo: string;
    idVersionEstrategia: string;
    tipoEstrategia: string;
    fechaHora: Date;
  },
  cotizaciones: CotizacionParaGuardar[],
): Promise<void> {
  const parametros: unknown[] = [];
  const valores = cotizaciones.map((cotizacion) => {
    const inicio = parametros.length + 1;
    parametros.push(
      cotizacion.idJugador,
      cotizacion.cotizacion,
      corrida.fechaHora,
      corrida.tipoEstrategia,
      corrida.idVersionEstrategia,
      corrida.idRecalculo,
      cotizacion.idEstadistica,
    );
    return `(${Array.from({ length: 7 }, (_, indice) => `$${inicio + indice}`).join(', ')})`;
  });

  if (valores.length === 0) return;

  await manager.query(
    `INSERT INTO cotizacion_vigente
      (id_jugador, cotizacion, fecha_hora, tipo_estrategia,
       id_version_estrategia, id_recalculo, id_estadistica)
     VALUES ${valores.join(', ')}
     ON CONFLICT (id_jugador, tipo_estrategia) DO UPDATE SET
       cotizacion = EXCLUDED.cotizacion,
       fecha_hora = EXCLUDED.fecha_hora,
       id_version_estrategia = EXCLUDED.id_version_estrategia,
       id_recalculo = EXCLUDED.id_recalculo,
       id_estadistica = EXCLUDED.id_estadistica`,
    parametros,
  );
}
