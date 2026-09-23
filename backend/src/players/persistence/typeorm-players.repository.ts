import { DataSource, EntityManager } from 'typeorm';
import { Equipo } from '../domain/equipo';
import { Jugador } from '../domain/jugador';
import { Liga } from '../domain/liga';
import {
  CatalogoBase,
  JugadorConRelaciones,
  PlayersRepository,
  ResumenActualizacionCatalogo,
} from '../players.repository';
import { EquipoEntity } from './equipo.entity';
import { JugadorEntity } from './jugador.entity';
import { LigaEntity } from './liga.entity';

export class TypeOrmPlayersRepository implements PlayersRepository {
  constructor(private readonly dataSource: DataSource) {}

  async onApplicationShutdown(): Promise<void> {
    if (this.dataSource.isInitialized) await this.dataSource.destroy();
  }

  async guardarCatalogo(catalogo: CatalogoBase): Promise<ResumenActualizacionCatalogo> {
    return this.dataSource.transaction(async (manager) => {
      const ligaIds = new Map<string, string>();
      const equipoIds = new Map<string, string>();

      for (const liga of catalogo.ligas) {
        const entity = await this.guardarLiga(manager, liga);
        ligaIds.set(liga.id, entity.id);
      }

      for (const equipo of catalogo.equipos) {
        const ligaId = ligaIds.get(equipo.ligaId);
        if (!ligaId) throw new Error('El catálogo contiene un equipo sin liga válida.');
        const entity = await this.guardarEquipo(manager, equipo, ligaId);
        equipoIds.set(equipo.id, entity.id);
      }

      for (const jugador of catalogo.jugadores) {
        const equipoId = equipoIds.get(jugador.equipoId);
        if (!equipoId) throw new Error('El catálogo contiene un jugador sin equipo válido.');
        await this.guardarJugador(manager, jugador, equipoId);
      }

      return {
        ligas: catalogo.ligas.length,
        equipos: catalogo.equipos.length,
        jugadores: catalogo.jugadores.length,
      };
    });
  }

  async listar(ligaCodigo?: string): Promise<JugadorConRelaciones[]> {
    const query = this.dataSource
      .getRepository(JugadorEntity)
      .createQueryBuilder('jugador')
      .innerJoinAndSelect('jugador.equipo', 'equipo')
      .innerJoinAndSelect('equipo.liga', 'liga')
      .orderBy('jugador.nombre', 'ASC')
      .addOrderBy('jugador.id', 'ASC');
    if (ligaCodigo) query.where('liga.codigo = :ligaCodigo', { ligaCodigo: ligaCodigo.trim().toUpperCase() });
    return (await query.getMany()).map((entity) => this.aModelo(entity));
  }

  async buscarPorId(id: string): Promise<JugadorConRelaciones | null> {
    const entity = await this.dataSource
      .getRepository(JugadorEntity)
      .createQueryBuilder('jugador')
      .innerJoinAndSelect('jugador.equipo', 'equipo')
      .innerJoinAndSelect('equipo.liga', 'liga')
      .where('jugador.id = :id', { id })
      .getOne();
    return entity ? this.aModelo(entity) : null;
  }

  private async guardarLiga(manager: EntityManager, liga: Liga): Promise<LigaEntity> {
    const repository = manager.getRepository(LigaEntity);
    const entity =
      (await repository.findOne({ where: { proveedorId: liga.proveedorId } })) ??
      repository.create({ id: liga.id, creadoEn: new Date() });
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
      (await repository.findOne({ where: { proveedorId: equipo.proveedorId } })) ??
      repository.create({ id: equipo.id, creadoEn: new Date() });
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
      (await repository.findOne({ where: { proveedorId: jugador.proveedorId } })) ??
      repository.create({ id: jugador.id, creadoEn: new Date() });
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

  private aModelo(entity: JugadorEntity): JugadorConRelaciones {
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
    return { jugador, equipo, liga };
  }
}
