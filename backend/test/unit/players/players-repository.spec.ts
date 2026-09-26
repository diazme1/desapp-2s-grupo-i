import { DataSource, EntityManager } from 'typeorm';
import { Equipo } from '../../../src/players/domain/equipo';
import { EstadisticasJugador } from '../../../src/players/domain/estadisticas-jugador';
import { Jugador } from '../../../src/players/domain/jugador';
import { Liga } from '../../../src/players/domain/liga';
import { TypeOrmPlayersRepository } from '../../../src/players/persistence/typeorm-players.repository';
import { EquipoEntity } from '../../../src/players/persistence/equipo.entity';
import { EstadisticasJugadorEntity } from '../../../src/players/persistence/estadisticas-jugador.entity';
import { JugadorEntity } from '../../../src/players/persistence/jugador.entity';
import { LigaEntity } from '../../../src/players/persistence/liga.entity';

function crearCatalogo() {
  const liga = Liga.crear({
    id: '3f1f8e5f-e2b9-4f4a-9d25-06c248d78e5b',
    proveedorId: 2021,
    codigo: 'PL',
    nombre: 'Premier League',
  });
  const equipo = Equipo.crear({
    id: 'd21b7e37-50a7-4da6-bfcb-4f4ecb7b7b99',
    proveedorId: 65,
    ligaId: liga.id,
    nombre: 'Manchester City FC',
  });
  const jugador = Jugador.crear({
    id: '8f4cf5a8-5b15-4d07-8f89-ecbdeec1f0fc',
    proveedorId: 44,
    equipoId: equipo.id,
    nombre: 'Cristiano Ronaldo',
  });
  return { ligas: [liga], equipos: [equipo], jugadores: [jugador] };
}

function crearRepositorioConTransaccion() {
  const ligaEntity = { id: 'liga-real' } as LigaEntity;
  const equipoEntity = { id: 'equipo-real' } as EquipoEntity;
  const jugadorEntity = { id: 'jugador-real' } as JugadorEntity;
  const estadisticasEntity = { id: 'estadistica-real' } as EstadisticasJugadorEntity;
  const repositorios = new Map<unknown, Record<string, jest.Mock>>([
    [LigaEntity, {
      findOne: jest.fn().mockResolvedValue(ligaEntity),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
    }],
    [EquipoEntity, {
      findOne: jest.fn().mockResolvedValue(equipoEntity),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
    }],
    [JugadorEntity, {
      findOne: jest.fn().mockResolvedValue(jugadorEntity),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
    }],
    [EstadisticasJugadorEntity, {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({ ...value, id: estadisticasEntity.id })),
    }],
  ]);
  const manager = {
    getRepository: jest.fn((entity) => repositorios.get(entity)),
  } as unknown as EntityManager;
  const dataSource = {
    transaction: jest.fn(async (operation) => operation(manager)),
    getRepository: jest.fn((entity) => repositorios.get(entity)),
  } as unknown as DataSource;
  return { repository: new TypeOrmPlayersRepository(dataSource), dataSource, manager, repositorios };
}

describe('TypeOrmPlayersRepository para estadísticas', () => {
  it('devuelve los jugadores procesados con el UUID real y las relaciones del mismo catálogo', async () => {
    const { repository, dataSource, repositorios } = crearRepositorioConTransaccion();

    const resultado = await repository.guardarCatalogo(crearCatalogo());

    expect(resultado.jugadoresProcesados).toEqual([
      {
        idJugador: 'jugador-real',
        nombreJugador: 'Cristiano Ronaldo',
        equipoJugador: 'Manchester City FC',
        ligaEquipoJugador: 'Premier League',
      },
    ]);
    expect(resultado.ligas).toBe(1);
    expect(resultado.equipos).toBe(1);
    expect(resultado.jugadores).toBe(1);
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(repositorios.get(JugadorEntity)?.findOne).toHaveBeenCalledTimes(1);
  });

  it('consulta únicamente la existencia puntual del jugador local', async () => {
    const { repository, dataSource } = crearRepositorioConTransaccion();

    await expect(repository.existePorId('jugador-real')).resolves.toBe(true);
    expect(dataSource.getRepository).toHaveBeenCalledWith(JugadorEntity);
  });

  it('guarda una observación completa en una transacción propia asociada por idJugador', async () => {
    const { repository, dataSource, repositorios } = crearRepositorioConTransaccion();
    const estadisticas = EstadisticasJugador.crear({
      idEstadistica: '5a1ce1cf-ef4d-4e04-871f-a54c51c3b7db',
      idJugador: 'jugador-real',
      goles: 0,
      asistencias: 2,
      tiros: null,
      pasesClave: 4,
      regates: 1,
      faltasCometidas: null,
      ratingWhoScored: 7.1,
    });

    await repository.guardarEstadisticas(estadisticas);

    const estadisticasRepository = repositorios.get(EstadisticasJugadorEntity);
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(estadisticasRepository?.create).toHaveBeenCalledWith(
      expect.objectContaining({
        id: estadisticas.idEstadistica,
        jugador: { id: 'jugador-real' },
        goles: 0,
        tiros: null,
      }),
    );
    expect(estadisticasRepository?.save).toHaveBeenCalledTimes(1);
  });
});
