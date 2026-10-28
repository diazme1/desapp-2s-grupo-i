import { DataSource, EntityManager } from 'typeorm';
import { HistorialCotizacionEntity } from '../../players/persistence/historial-cotizacion.entity';
import { JugadorEntity } from '../../players/persistence/jugador.entity';
import { Cotizacion } from '../domain/cotizacion';
import { TenenciaJugador } from '../domain/tenencia-jugador';
import { TokenJugador } from '../domain/token-jugador';
import { MarketRepository, MarketTransaction } from '../market.repository';
import { TenenciaJugadorEntity } from './tenencia-jugador.entity';
import { TokenJugadorEntity } from './token-jugador.entity';

export class TypeOrmMarketRepository implements MarketRepository {
  constructor(private readonly dataSource: DataSource) {}

  async listarIdsJugadores(): Promise<string[]> {
    const rows = await this.dataSource
      .getRepository(JugadorEntity)
      .find({ select: { id: true }, order: { id: 'ASC' } });
    return rows.map((row) => row.id);
  }

  async listarIdsJugadoresConEstadisticas(): Promise<string[]> {
    const rows = await this.dataSource
      .getRepository(JugadorEntity)
      .createQueryBuilder('jugador')
      .innerJoin('jugador.estadisticas', 'estadistica')
      .select('jugador.id', 'id')
      .distinct(true)
      .orderBy('jugador.id', 'ASC')
      .getRawMany<{ id: string }>();
    return rows.map((row) => row.id);
  }

  async enTransaccion<T>(
    work: (transaction: MarketTransaction) => Promise<T>,
  ): Promise<T> {
    return this.dataSource.transaction(async (manager) =>
      work(this.contexto(manager)),
    );
  }

  private contexto(manager: EntityManager): MarketTransaction {
    return {
      async bloquearJugador(jugadorId) {
        const jugador = await manager.getRepository(JugadorEntity).findOne({
          select: { id: true },
          where: { id: jugadorId },
          lock: { mode: 'pessimistic_write' },
        });
        return jugador !== null;
      },
      async listarTokens(jugadorId) {
        const rows = await manager.getRepository(TokenJugadorEntity).find({
          where: { jugadorId },
          order: { numeroEmision: 'ASC' },
        });
        return rows.map((row) =>
          TokenJugador.emitir({
            idToken: row.idToken,
            jugadorId: row.jugadorId,
            usuarioOwnerId: row.usuarioOwnerId,
            numeroEmision: row.numeroEmision,
            loteEmisionId: row.loteEmisionId,
            emitidoEn: row.emitidoEn,
            actualizadoEn: row.actualizadoEn,
          }),
        );
      },
      async listarTenencias(jugadorId) {
        const rows = await manager.getRepository(TenenciaJugadorEntity).find({
          where: { jugadorId },
          order: { usuarioId: 'ASC' },
        });
        return rows.map((row) =>
          TenenciaJugador.crear({
            id: row.id,
            usuarioId: row.usuarioId,
            jugadorId: row.jugadorId,
            cantidadTokens: row.cantidadTokens,
            creadoEn: row.creadoEn,
            actualizadoEn: row.actualizadoEn,
          }),
        );
      },
      async obtenerApertura(jugadorId) {
        const row = await manager
          .getRepository(HistorialCotizacionEntity)
          .findOne({
            relations: { estadistica: true },
            where: { jugador: { id: jugadorId }, tipoEstrategia: 'apertura_mercado' },
          });
        return row
          ? {
              cotizacion: row.cotizacion instanceof Cotizacion
                ? row.cotizacion
                : Cotizacion.fromDecimal(String(row.cotizacion)),
              idVersionEstrategia: row.idVersionEstrategia,
              idRecalculo: row.idRecalculo,
              idEstadistica: row.estadistica?.id ?? null,
            }
          : null;
      },
      async insertarTokens(tokens) {
        if (tokens.length === 0) return;
        const repository = manager.getRepository(TokenJugadorEntity);
        await repository.insert(
          tokens.map((token) => ({
            idToken: token.idToken,
            jugadorId: token.jugadorId,
            usuarioOwnerId: token.usuarioOwnerId,
            numeroEmision: token.numeroEmision,
            loteEmisionId: token.loteEmisionId,
            emitidoEn: token.emitidoEn,
            actualizadoEn: token.actualizadoEn,
          })),
        );
      },
      async insertarTenencia(tenencia) {
        await manager.getRepository(TenenciaJugadorEntity).insert({
          id: tenencia.id,
          usuarioId: tenencia.usuarioId,
          jugadorId: tenencia.jugadorId,
          cantidadTokens: tenencia.cantidadTokens,
          creadoEn: tenencia.creadoEn,
          actualizadoEn: tenencia.actualizadoEn,
        });
      },
      async insertarApertura(row) {
        await manager.getRepository(HistorialCotizacionEntity).insert({
          id: row.id,
          jugador: { id: row.jugadorId },
          fechaHora: row.fechaHora,
          cotizacion: Cotizacion.fromDecimal(row.cotizacion),
          tipoEstrategia: row.tipoEstrategia,
          idVersionEstrategia: row.idVersionEstrategia,
          idRecalculo: null,
          estadistica: null,
        });
      },
    };
  }
}

