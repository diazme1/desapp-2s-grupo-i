import { DataSource, EntityManager } from 'typeorm';
import { randomUUID } from 'node:crypto';
import type { WhoScoredOperationContext } from '../adapters/whoscored/whoscored.types';
import { EstadisticasJugador } from '../domain/estadisticas-jugador';
import { Equipo } from '../domain/equipo';
import { Jugador } from '../domain/jugador';
import { Liga } from '../domain/liga';
import {
  CatalogoBase,
  JugadorConEstadisticas,
  JugadorConRelaciones,
  JugadorProcesado,
  PlayersRepository,
  ResultadoGuardadoCatalogo,
} from '../players.repository';
import { EquipoEntity } from './equipo.entity';
import { EstadisticasJugadorEntity } from './estadisticas-jugador.entity';
import { HistorialCotizacionEntity } from './historial-cotizacion.entity';
import { VersionEstrategiaCotizacionEntity } from './version-estrategia-cotizacion.entity';
import { RecalculoCotizacionEntity } from './recalculo-cotizacion.entity';
import { JugadorEntity } from './jugador.entity';
import { LigaEntity } from './liga.entity';
import type { QuoteHistoryRepository } from '../../quotes/quotes.repository';
import type {
  QuoteRecalculationRepository,
  QuoteRecalculationUnitOfWork,
} from '../../quotes/quote-recalculation.repository';
import type {
  CotizacionParaGuardar,
  CorridaCotizacionParaGuardar,
  EstadisticaParaRecalculo,
} from '../../quotes/quote-recalculation.repository';
import type { TipoEstrategiaCotizacion } from '../domain/estrategia-cotizacion';
import type {
  QuoteRankingRepository,
  RankingCotizaciones,
} from '../../quotes/quote-ranking.repository';

export class TypeOrmPlayersRepository
  implements
    PlayersRepository,
    QuoteHistoryRepository,
    QuoteRecalculationRepository,
    QuoteRankingRepository
{
  private shutdownPromise?: Promise<void>;

  constructor(private readonly dataSource: DataSource) {}

  onApplicationShutdown(): Promise<void> {
    this.shutdownPromise ??= this.dataSource.isInitialized
      ? this.dataSource.destroy()
      : Promise.resolve();
    return this.shutdownPromise;
  }

  async guardarCatalogo(
    catalogo: CatalogoBase,
  ): Promise<ResultadoGuardadoCatalogo> {
    return this.dataSource.transaction(async (manager) => {
      const ligaIds = new Map<string, string>();
      const equipoIds = new Map<string, string>();
      const ligasPorId = new Map(catalogo.ligas.map((liga) => [liga.id, liga]));
      const equiposPorId = new Map(
        catalogo.equipos.map((equipo) => [equipo.id, equipo]),
      );
      const jugadoresProcesados: JugadorProcesado[] = [];

      for (const liga of catalogo.ligas) {
        const entity = await this.guardarLiga(manager, liga);
        ligaIds.set(liga.id, entity.id);
      }

      for (const equipo of catalogo.equipos) {
        const ligaId = ligaIds.get(equipo.ligaId);
        if (!ligaId)
          throw new Error('El catálogo contiene un equipo sin liga válida.');
        const entity = await this.guardarEquipo(manager, equipo, ligaId);
        equipoIds.set(equipo.id, entity.id);
      }

      for (const jugador of catalogo.jugadores) {
        const equipoId = equipoIds.get(jugador.equipoId);
        if (!equipoId)
          throw new Error('El catálogo contiene un jugador sin equipo válido.');
        const equipo = equiposPorId.get(jugador.equipoId);
        const liga = equipo ? ligasPorId.get(equipo.ligaId) : undefined;
        if (!equipo || !liga)
          throw new Error('El catálogo contiene relaciones inválidas.');
        const guardado = await this.guardarJugador(manager, jugador, equipoId);
        jugadoresProcesados.push({
          idJugador: guardado.id,
          nombreJugador: jugador.nombre,
          equipoJugador: equipo.nombre,
          ...(equipo.nombreCorto
            ? { equipoJugadorAlternativos: [equipo.nombreCorto] }
            : {}),
          ligaEquipoJugador: liga.nombre,
        });
      }

      return {
        ligas: catalogo.ligas.length,
        equipos: catalogo.equipos.length,
        jugadores: catalogo.jugadores.length,
        jugadoresProcesados,
      };
    });
  }

  async guardarEstadisticas(
    estadisticas: EstadisticasJugador,
    _context?: WhoScoredOperationContext,
  ): Promise<string> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(EstadisticasJugadorEntity);
      const entity = repository.create({
        id: estadisticas.idEstadistica,
        jugador: { id: estadisticas.idJugador } as JugadorEntity,
        goles: estadisticas.goles,
        asistencias: estadisticas.asistencias,
        tiros: estadisticas.tiros,
        pasesClave: estadisticas.pasesClave,
        regates: estadisticas.regates,
        faltasCometidas: estadisticas.faltasCometidas,
        ratingWhoScored: estadisticas.ratingWhoScored,
      });
      const guardada = await repository.save(entity);
      return guardada.id;
    });
  }

  async listar(ligaCodigo?: string): Promise<JugadorConRelaciones[]> {
    const query = this.dataSource
      .getRepository(JugadorEntity)
      .createQueryBuilder('jugador')
      .innerJoinAndSelect('jugador.equipo', 'equipo')
      .innerJoinAndSelect('equipo.liga', 'liga')
      .leftJoinAndSelect('jugador.estadisticas', 'estadisticas')
      .orderBy('jugador.nombre', 'ASC')
      .addOrderBy('jugador.id', 'ASC');
    if (ligaCodigo)
      query.where('liga.codigo = :ligaCodigo', {
        ligaCodigo: ligaCodigo.trim().toUpperCase(),
      });
    return (await query.getMany()).map((entity) => this.aModelo(entity));
  }

  async buscarPorId(id: string): Promise<JugadorConEstadisticas | null> {
    const entity = await this.dataSource
      .getRepository(JugadorEntity)
      .createQueryBuilder('jugador')
      .innerJoinAndSelect('jugador.equipo', 'equipo')
      .innerJoinAndSelect('equipo.liga', 'liga')
      .leftJoinAndSelect('jugador.estadisticas', 'estadisticas')
      .where('jugador.id = :id', { id })
      .getOne();
    return entity ? this.aModelo(entity) : null;
  }

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
              vigente.cotizacion
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
    }>;

    return {
      estrategia,
      idRecalculo: corrida.id,
      fechaHora: corrida.fechaHora,
      jugadores: jugadores.map((jugador) => ({
        ...jugador,
        cotizacion: Number(jugador.cotizacion),
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
        obtenerOCrearVersionEstrategia: async (input) => {
          const repository = manager.getRepository(
            VersionEstrategiaCotizacionEntity,
          );
          let entity = await repository.findOne({
            where: {
              tipoEstrategia: input.tipo,
              numeroVersion: input.version,
            },
          });
          if (!entity) {
            entity = await repository.save(
              repository.create({
                id: randomUUID(),
                tipoEstrategia: input.tipo,
                numeroVersion: input.version,
                pesos: input.pesos,
              }),
            );
          }
          return {
            id: entity.id,
            tipoEstrategia: entity.tipoEstrategia,
            numeroVersion: entity.numeroVersion,
            pesos: entity.pesos,
          };
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

  private async guardarLiga(
    manager: EntityManager,
    liga: Liga,
  ): Promise<LigaEntity> {
    const repository = manager.getRepository(LigaEntity);
    const entity =
      (await repository.findOne({
        where: { proveedorId: liga.proveedorId },
      })) ?? repository.create({ id: liga.id, creadoEn: new Date() });
    entity.proveedorId = liga.proveedorId;
    entity.codigo = liga.codigo;
    entity.nombre = liga.nombre;
    entity.pais = liga.pais;
    entity.emblemaUrl = liga.emblemaUrl;
    entity.actualizadoEn = new Date();
    return repository.save(entity);
  }

  private async guardarEquipo(
    manager: EntityManager,
    equipo: Equipo,
    ligaId: string,
  ): Promise<EquipoEntity> {
    const repository = manager.getRepository(EquipoEntity);
    const entity =
      (await repository.findOne({
        where: { proveedorId: equipo.proveedorId },
      })) ?? repository.create({ id: equipo.id, creadoEn: new Date() });
    entity.proveedorId = equipo.proveedorId;
    entity.nombre = equipo.nombre;
    entity.nombreCorto = equipo.nombreCorto;
    entity.sigla = equipo.sigla;
    entity.escudoUrl = equipo.escudoUrl;
    entity.liga = { id: ligaId } as LigaEntity;
    entity.actualizadoEn = new Date();
    return repository.save(entity);
  }

  private async guardarJugador(
    manager: EntityManager,
    jugador: Jugador,
    equipoId: string,
  ): Promise<JugadorEntity> {
    const repository = manager.getRepository(JugadorEntity);
    const entity =
      (await repository.findOne({
        where: { proveedorId: jugador.proveedorId },
      })) ?? repository.create({ id: jugador.id, creadoEn: new Date() });
    entity.proveedorId = jugador.proveedorId;
    entity.nombre = jugador.nombre;
    entity.nombreCompleto = jugador.nombreCompleto;
    entity.posicion = jugador.posicion;
    entity.fechaNacimiento = jugador.fechaNacimiento;
    entity.nacionalidad = jugador.nacionalidad;
    entity.equipo = { id: equipoId } as EquipoEntity;
    entity.actualizadoEn = new Date();
    return repository.save(entity);
  }

  private aModelo(entity: JugadorEntity): JugadorConEstadisticas {
    const liga = Liga.crear({
      id: entity.equipo.liga.id,
      proveedorId: entity.equipo.liga.proveedorId,
      codigo: entity.equipo.liga.codigo,
      nombre: entity.equipo.liga.nombre,
      pais: entity.equipo.liga.pais,
      emblemaUrl: entity.equipo.liga.emblemaUrl,
    });
    const equipo = Equipo.crear({
      id: entity.equipo.id,
      proveedorId: entity.equipo.proveedorId,
      ligaId: liga.id,
      nombre: entity.equipo.nombre,
      nombreCorto: entity.equipo.nombreCorto,
      sigla: entity.equipo.sigla,
      escudoUrl: entity.equipo.escudoUrl,
    });
    const jugador = Jugador.crear({
      id: entity.id,
      proveedorId: entity.proveedorId,
      equipoId: equipo.id,
      nombre: entity.nombre,
      nombreCompleto: entity.nombreCompleto,
      posicion: entity.posicion,
      fechaNacimiento: entity.fechaNacimiento,
      nacionalidad: entity.nacionalidad,
    });
    return {
      jugador,
      equipo,
      liga,
      estadisticas: (entity.estadisticas ?? []).map((estadistica) =>
        EstadisticasJugador.crear({
          idEstadistica: estadistica.id,
          idJugador: entity.id,
          goles: estadistica.goles,
          asistencias: estadistica.asistencias,
          tiros: estadistica.tiros,
          pasesClave: estadistica.pasesClave,
          regates: estadistica.regates,
          faltasCometidas: estadistica.faltasCometidas,
          ratingWhoScored: estadistica.ratingWhoScored,
        }),
      ),
    };
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
