import { DataSource, EntityManager } from 'typeorm';
import { Cotizacion } from '../../market/domain/cotizacion';
import { TokenJugador } from '../../market/domain/token-jugador';
import { TenenciaJugador } from '../../market/domain/tenencia-jugador';
import { Jugador } from '../../players/domain/jugador';
import { JugadorEntity } from '../../players/persistence/jugador.entity';
import { RecalculoCotizacionActivoEntity } from '../../players/persistence/recalculo-cotizacion-activo.entity';
import { SaldoUsuario } from '../../users/domain/saldo-usuario';
import { SaldoExacto } from '../../users/domain/saldo-exacto';
import { User, UserRole } from '../../users/domain/user';
import { SaldoUsuarioEntity } from '../../users/persistence/saldo-usuario.entity';
import { UserEntity } from '../../users/persistence/user.entity';
import {
  ActiveQuoteSnapshot,
  ExistingMarketTransaction,
  LoadBuyContextInput,
  LoadSellContextInput,
  LockedBuyContext,
  LockedSellContext,
  OrdersRepository,
  OrdersUnitOfWork,
} from '../orders.repository';
import type { BuyOrderResult } from '../domain/orden-compra';
import type { SellOrderResult } from '../domain/orden-venta';
import type {
  AuditoriaTransaccionSnapshot,
  TransaccionMercadoSnapshot,
} from '../domain/transaccion-mercado';
import { AuditoriaTransaccionEntity } from './auditoria-transaccion.entity';
import { TransaccionMercadoEntity } from './transaccion-mercado.entity';
import { TokenJugadorEntity } from '../../market/persistence/token-jugador.entity';
import { TenenciaJugadorEntity } from '../../market/persistence/tenencia-jugador.entity';

type LoadMarketOperationInput = {
  compradorId?: string;
  compradorEmail?: string;
  vendedorId?: string;
  vendedorEmail?: string;
  jugadorId: string;
  claveIdempotencia: string;
};

type MarketOrderResult = BuyOrderResult | SellOrderResult;

export class TypeOrmOrdersRepository implements OrdersRepository {
  constructor(private readonly dataSource: DataSource) {}

  onApplicationShutdown(): Promise<void> {
    return this.dataSource.isInitialized
      ? this.dataSource.destroy()
      : Promise.resolve();
  }

  enTransaccion<T>(
    work: (unitOfWork: OrdersUnitOfWork) => Promise<T>,
  ): Promise<T> {
    return this.dataSource.transaction(async (manager) =>
      work(this.unitOfWork(manager)),
    );
  }

  private unitOfWork(manager: EntityManager): OrdersUnitOfWork {
    return {
      resolverCotizacionVigente: (jugadorId) =>
        this.resolverCotizacionVigente(manager, jugadorId),
      bloquearYcargarCompra: (input: LoadBuyContextInput) =>
        this.bloquearYcargarOperacion(manager, {
          compradorId: input.compradorId,
          vendedorEmail: input.vendedorEmail,
          jugadorId: input.jugadorId,
          claveIdempotencia: input.claveIdempotencia,
        }),
      bloquearYcargarVenta: (input: LoadSellContextInput) =>
        this.bloquearYcargarOperacion(manager, {
          vendedorId: input.vendedorId,
          compradorEmail: input.compradorEmail,
          jugadorId: input.jugadorId,
          claveIdempotencia: input.claveIdempotencia,
        }),
      persistirCompra: (resultado) => this.persistirMercado(manager, resultado),
      persistirVenta: (resultado) => this.persistirMercado(manager, resultado),
    };
  }

  private async bloquearYcargarOperacion(
    manager: EntityManager,
    input: LoadMarketOperationInput,
  ): Promise<LockedBuyContext & LockedSellContext> {
    await manager.query(
      'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
      [input.claveIdempotencia],
    );
    const ordenExistente = await this.cargarOrden(
      manager,
      input.claveIdempotencia,
    );
    const activo = await this.bloquearEstrategiaActiva(manager);
    const jugadorEntity = await manager
      .getRepository(JugadorEntity)
      .createQueryBuilder('jugador')
      .innerJoinAndSelect('jugador.equipo', 'equipo')
      .where('jugador.id = :jugadorId', { jugadorId: input.jugadorId })
      .setLock('pessimistic_write')
      .getOne();
    const jugador = jugadorEntity ? mapJugador(jugadorEntity) : null;
    const quote = await this.cargarCotizacionVigente(
      manager,
      input.jugadorId,
      activo,
    );

    const [buyerEntity, sellerEntity] = await Promise.all([
      input.compradorId
        ? manager.getRepository(UserEntity).findOne({
            where: { id: input.compradorId },
          })
        : input.compradorEmail
          ? manager.getRepository(UserEntity).findOne({
              where: { correo: input.compradorEmail.trim().toLowerCase() },
            })
          : Promise.resolve(null),
      input.vendedorId
        ? manager.getRepository(UserEntity).findOne({
            where: { id: input.vendedorId },
          })
        : input.vendedorEmail
          ? manager.getRepository(UserEntity).findOne({
              where: { correo: input.vendedorEmail.trim().toLowerCase() },
            })
          : Promise.resolve(null),
    ]);
    const userIds = [buyerEntity?.id, sellerEntity?.id]
      .filter((id): id is string => Boolean(id))
      .sort((a, b) => a.localeCompare(b));
    const lockedUsers = new Map<string, UserEntity>();
    for (const userId of userIds) {
      const entity = await manager.getRepository(UserEntity).findOne({
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (entity) lockedUsers.set(entity.id, entity);
    }
    const comprador = buyerEntity
      ? mapUser(lockedUsers.get(buyerEntity.id) ?? buyerEntity)
      : null;
    const vendedor = sellerEntity
      ? mapUser(lockedUsers.get(sellerEntity.id) ?? sellerEntity)
      : null;

    const balances = new Map<string, SaldoUsuario | null>();
    for (const userId of userIds) {
      const row = await manager.getRepository(SaldoUsuarioEntity).findOne({
        where: { usuarioId: userId },
        lock: { mode: 'pessimistic_write' },
      });
      balances.set(
        userId,
        row ? mapSaldo(row, lockedUsers.get(userId)?.rol) : null,
      );
    }

    const tokenRows = await manager.getRepository(TokenJugadorEntity).find({
      where: { jugadorId: input.jugadorId },
      order: { numeroEmision: 'ASC' },
      lock: { mode: 'pessimistic_write' },
    });
    const tokensJugador = tokenRows.map(mapToken);
    const tenencias = new Map<string, TenenciaJugador | null>();
    for (const userId of userIds) {
      const row = await manager.getRepository(TenenciaJugadorEntity).findOne({
        where: { usuarioId: userId, jugadorId: input.jugadorId },
        lock: { mode: 'pessimistic_write' },
      });
      tenencias.set(userId, row ? mapTenencia(row) : null);
    }

    return {
      comprador,
      vendedor,
      jugador,
      quote,
      saldoComprador: comprador ? (balances.get(comprador.id) ?? null) : null,
      saldoVendedor: vendedor ? (balances.get(vendedor.id) ?? null) : null,
      tokensJugador,
      tenenciaComprador: comprador
        ? (tenencias.get(comprador.id) ?? null)
        : null,
      tenenciaVendedor: vendedor ? (tenencias.get(vendedor.id) ?? null) : null,
      ordenExistente,
    };
  }

  private async resolverCotizacionVigente(
    manager: EntityManager,
    jugadorId: string,
  ): Promise<ActiveQuoteSnapshot | null> {
    const activo = await this.bloquearEstrategiaActiva(manager);
    return this.cargarCotizacionVigente(manager, jugadorId, activo);
  }

  private bloquearEstrategiaActiva(
    manager: EntityManager,
  ): Promise<RecalculoCotizacionActivoEntity | null> {
    return manager
      .getRepository(RecalculoCotizacionActivoEntity)
      .findOne({ where: { id: 1 }, lock: { mode: 'pessimistic_write' } });
  }

  private async cargarCotizacionVigente(
    manager: EntityManager,
    jugadorId: string,
    activo: RecalculoCotizacionActivoEntity | null,
  ): Promise<ActiveQuoteSnapshot | null> {
    if (!activo?.tipoEstrategia || !activo.idRecalculo) return null;
    const rows = (await manager.query(
      `SELECT id_jugador AS "idJugador",
              tipo_estrategia AS "tipoEstrategia",
              cotizacion::text AS cotizacion,
              fecha_hora AS "fechaHora",
              id_version_estrategia AS "idVersionEstrategia",
              id_recalculo AS "idRecalculo"
       FROM cotizacion_vigente
       WHERE id_jugador = $1 AND tipo_estrategia = $2
       FOR UPDATE`,
      [jugadorId, activo.tipoEstrategia],
    )) as Array<{
      idJugador: string;
      tipoEstrategia: string;
      cotizacion: string;
      fechaHora: Date;
      idVersionEstrategia: string;
      idRecalculo: string;
    }>;
    const row = rows[0];
    if (!row || row.idRecalculo !== activo.idRecalculo) return null;
    return {
      estrategia: row.tipoEstrategia,
      idVersionEstrategia: row.idVersionEstrategia,
      idRecalculo: row.idRecalculo,
      cotizacion: Cotizacion.fromDecimal(row.cotizacion),
      fechaHora: row.fechaHora,
    };
  }

  private async cargarOrden(
    manager: EntityManager,
    claveIdempotencia: string,
  ): Promise<ExistingMarketTransaction | null> {
    const row = await manager.getRepository(TransaccionMercadoEntity).findOne({
      where: { claveIdempotencia },
      lock: { mode: 'pessimistic_write' },
    });
    return row ? mapOrden(row) : null;
  }

  private async persistirMercado(
    manager: EntityManager,
    resultado: MarketOrderResult,
  ): Promise<void> {
    if (resultado.tipo === 'replay') return;
    await manager.getRepository(TokenJugadorEntity).save(
      resultado.tokensTransferidos.map((token) => ({
        idToken: token.idToken,
        jugadorId: token.jugadorId,
        usuarioOwnerId: token.usuarioOwnerId,
        numeroEmision: token.numeroEmision,
        loteEmisionId: token.loteEmisionId,
        emitidoEn: token.emitidoEn,
        actualizadoEn: token.actualizadoEn,
      })),
    );
    if (resultado.tenenciaVendedor)
      await manager
        .getRepository(TenenciaJugadorEntity)
        .save(mapTenenciaEntity(resultado.tenenciaVendedor));
    if (resultado.tenenciaComprador)
      await manager
        .getRepository(TenenciaJugadorEntity)
        .save(mapTenenciaEntity(resultado.tenenciaComprador));
    if (resultado.saldoComprador)
      await manager
        .getRepository(SaldoUsuarioEntity)
        .save(mapSaldoEntity(resultado.saldoComprador));
    if (resultado.saldoVendedor)
      await manager
        .getRepository(SaldoUsuarioEntity)
        .save(mapSaldoEntity(resultado.saldoVendedor));
    await manager
      .getRepository(TransaccionMercadoEntity)
      .insert(mapTransaccionEntity(resultado.orden));
    if (resultado.auditoria)
      await manager
        .getRepository(AuditoriaTransaccionEntity)
        .insert(mapAuditoriaEntity(resultado.auditoria));
  }
}

function mapUser(entity: UserEntity): User {
  return User.create(entity);
}

function mapJugador(entity: JugadorEntity): Jugador {
  return Jugador.crear({
    id: entity.id,
    proveedorId: entity.proveedorId,
    equipoId: entity.equipo.id,
    nombre: entity.nombre,
    nombreCompleto: entity.nombreCompleto,
    posicion: entity.posicion,
    fechaNacimiento: entity.fechaNacimiento,
    nacionalidad: entity.nacionalidad,
  });
}

function mapSaldo(
  entity: SaldoUsuarioEntity,
  rol: UserRole = UserRole.USER,
): SaldoUsuario {
  return SaldoUsuario.crear({
    id: entity.usuarioId,
    usuarioId: entity.usuarioId,
    rol,
    creditosDisponibles: SaldoExacto.fromUnidades(entity.creditosDisponibles),
    creadoEn: entity.creadoEn,
    actualizadoEn: entity.actualizadoEn,
  });
}

function mapToken(entity: TokenJugadorEntity): TokenJugador {
  return TokenJugador.emitir({
    idToken: entity.idToken,
    jugadorId: entity.jugadorId,
    usuarioOwnerId: entity.usuarioOwnerId,
    numeroEmision: entity.numeroEmision,
    loteEmisionId: entity.loteEmisionId,
    emitidoEn: entity.emitidoEn,
    actualizadoEn: entity.actualizadoEn,
  });
}

function mapTenencia(entity: TenenciaJugadorEntity): TenenciaJugador {
  return TenenciaJugador.crear({
    id: entity.id,
    usuarioId: entity.usuarioId,
    jugadorId: entity.jugadorId,
    cantidadTokens: entity.cantidadTokens,
    creadoEn: entity.creadoEn,
    actualizadoEn: entity.actualizadoEn,
  });
}

function mapOrden(entity: TransaccionMercadoEntity): ExistingMarketTransaction {
  return {
    idOperacion: entity.idOperacion,
    tipo: entity.tipo,
    claveIdempotencia: entity.claveIdempotencia,
    compradorId: entity.compradorId,
    vendedorId: entity.vendedorId,
    jugadorId: entity.jugadorId,
    cantidadTokens: entity.cantidadTokens,
    cotizacion: Cotizacion.fromDecimal(entity.cotizacion),
    importeCreditos: BigInt(entity.importeCreditos),
    estrategia: entity.tipoEstrategia,
    idVersionEstrategia: entity.idVersionEstrategia,
    idRecalculo: entity.idRecalculo,
    fechaHora: entity.fechaHora,
  };
}

function mapTransaccionEntity(
  snapshot: TransaccionMercadoSnapshot,
): Partial<TransaccionMercadoEntity> {
  return {
    idOperacion: snapshot.idOperacion,
    tipo: snapshot.tipo,
    claveIdempotencia: snapshot.claveIdempotencia,
    compradorId: snapshot.compradorId,
    vendedorId: snapshot.vendedorId,
    jugadorId: snapshot.jugadorId,
    cantidadTokens: snapshot.cantidadTokens,
    cotizacion: snapshot.cotizacion.toDecimalString(),
    importeCreditos: snapshot.importeCreditos,
    tipoEstrategia: snapshot.estrategia,
    idVersionEstrategia: snapshot.idVersionEstrategia,
    idRecalculo: snapshot.idRecalculo,
    fechaHora: snapshot.fechaHora,
    creadoEn: snapshot.fechaHora,
  };
}

function mapAuditoriaEntity(
  snapshot: AuditoriaTransaccionSnapshot,
): Partial<AuditoriaTransaccionEntity> {
  return {
    idAuditoria: snapshot.idAuditoria,
    idOperacion: snapshot.idOperacion,
    tipo: snapshot.tipo,
    compradorId: snapshot.compradorId,
    vendedorId: snapshot.vendedorId,
    jugadorId: snapshot.jugadorId,
    cantidadTokens: snapshot.cantidadTokens,
    cotizacion: snapshot.cotizacion.toDecimalString(),
    importeCreditos: snapshot.importeCreditos,
    tipoEstrategia: snapshot.estrategia,
    idVersionEstrategia: snapshot.idVersionEstrategia,
    idRecalculo: snapshot.idRecalculo,
    fechaHora: snapshot.fechaHora,
    claveIdempotencia: snapshot.claveIdempotencia,
  };
}

function mapSaldoEntity(saldo: SaldoUsuario): Partial<SaldoUsuarioEntity> {
  return {
    usuarioId: saldo.usuarioId,
    creditosDisponibles: saldo.creditosDisponibles.toUnidades(),
    creadoEn: saldo.creadoEn,
    actualizadoEn: saldo.actualizadoEn,
  };
}

function mapTenenciaEntity(
  tenencia: TenenciaJugador,
): Partial<TenenciaJugadorEntity> {
  return {
    id: tenencia.id,
    usuarioId: tenencia.usuarioId,
    jugadorId: tenencia.jugadorId,
    cantidadTokens: tenencia.cantidadTokens,
    creadoEn: tenencia.creadoEn,
    actualizadoEn: tenencia.actualizadoEn,
  };
}
