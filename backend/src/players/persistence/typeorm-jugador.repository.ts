import { DataSource } from 'typeorm';
import { Equipo } from '../domain/equipo';
import { IdentidadExternaJugador } from '../domain/identidad-externa-jugador';
import { Jugador } from '../domain/jugador';
import { Liga } from '../domain/liga';
import type {
  FiltrosJugadores,
  JugadorRepository,
  ResultadoJugadores,
} from '../players.repository';
import { EquipoEntity } from './equipo.entity';
import { IdentidadExternaJugadorEntity } from './identidad-externa-jugador.entity';
import { JugadorEntity } from './jugador.entity';
import { LigaEntity } from './liga.entity';

export class TypeOrmJugadorRepository implements JugadorRepository {
  constructor(private readonly dataSource: DataSource) {}

  async onApplicationShutdown(): Promise<void> {
    if (this.dataSource.isInitialized) await this.dataSource.destroy();
  }

  async listar(filtros: FiltrosJugadores): Promise<ResultadoJugadores> {
    const query = this.dataSource
      .getRepository(JugadorEntity)
      .createQueryBuilder('jugador')
      .innerJoinAndSelect('jugador.liga', 'liga')
      .innerJoinAndSelect('jugador.equipo', 'equipo')
      .where('jugador.activo = :activo', { activo: filtros.activo ?? true });

    if (filtros.liga) {
      query.andWhere('(liga.id = :liga OR LOWER(liga.codigo) = LOWER(:liga))', {
        liga: filtros.liga,
      });
    }
    if (filtros.equipo) {
      query.andWhere('(equipo.id = :equipo OR LOWER(equipo.nombre) = LOWER(:equipo))', {
        equipo: filtros.equipo,
      });
    }
    if (filtros.posicion) {
      query.andWhere('LOWER(jugador.posicion) = LOWER(:posicion)', {
        posicion: filtros.posicion,
      });
    }

    query.orderBy('jugador.nombre', 'ASC').addOrderBy('jugador.id', 'ASC');
    const [entities, total] = await query.getManyAndCount();
    return { items: entities.map((entity) => this.toDomain(entity)), total };
  }

  async buscarActivoPorId(id: string): Promise<Jugador | null> {
    const entity = await this.dataSource.getRepository(JugadorEntity).findOne({
      where: { id, activo: true },
      relations: { liga: true, equipo: true },
    });
    return entity ? this.toDomain(entity) : null;
  }

  async buscarPorIdentidadExterna(proveedor: string, externalId: string): Promise<Jugador | null> {
    const identidad = await this.dataSource
      .getRepository(IdentidadExternaJugadorEntity)
      .findOne({
        where: { proveedor: proveedor.trim().toLowerCase(), externalId: externalId.trim().toLowerCase() },
        relations: { jugador: { liga: true, equipo: true } },
      });
    return identidad?.jugador ? this.toDomain(identidad.jugador) : null;
  }

  async guardar(jugador: Jugador): Promise<Jugador> {
    const repository = this.dataSource.getRepository(JugadorEntity);
    const entity = repository.create({
      id: jugador.id,
      nombre: jugador.nombre,
      posicion: jugador.posicion,
      activo: jugador.activo,
      actualizadoEn: jugador.actualizadoEn,
      liga: { id: jugador.liga.id } as LigaEntity,
      equipo: { id: jugador.equipo.id } as EquipoEntity,
    });
    await repository.save(entity);
    const saved = await repository.findOneOrFail({
      where: { id: jugador.id },
      relations: { liga: true, equipo: true },
    });
    return this.toDomain(saved);
  }

  async guardarIdentidadExterna(identidad: IdentidadExternaJugador): Promise<void> {
    await this.dataSource.getRepository(IdentidadExternaJugadorEntity).save(
      this.dataSource.getRepository(IdentidadExternaJugadorEntity).create({
        id: identidad.id,
        jugador: { id: identidad.jugadorId } as JugadorEntity,
        proveedor: identidad.proveedor,
        externalId: identidad.externalId,
      }),
    );
  }

  private toDomain(entity: JugadorEntity): Jugador {
    const liga = Liga.crear({ id: entity.liga.id, codigo: entity.liga.codigo, nombre: entity.liga.nombre });
    const equipo = Equipo.crear({ id: entity.equipo.id, nombre: entity.equipo.nombre, liga });
    const jugador = Jugador.crear({
      id: entity.id,
      nombre: entity.nombre,
      posicion: entity.posicion,
      equipo,
      liga,
      activo: entity.activo,
      actualizadoEn: entity.actualizadoEn,
    });
    for (const identidad of entity.identidadesExternas ?? []) {
      jugador.asociarIdentidadExterna(
        IdentidadExternaJugador.crear({
          id: identidad.id,
          jugadorId: entity.id,
          proveedor: identidad.proveedor,
          externalId: identidad.externalId,
        }),
      );
    }
    return jugador;
  }
}
