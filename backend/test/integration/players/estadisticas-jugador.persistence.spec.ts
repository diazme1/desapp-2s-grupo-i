import { DataSource } from 'typeorm';
import { Equipo } from '../../../src/players/domain/equipo';
import { EstadisticasJugador } from '../../../src/players/domain/estadisticas-jugador';
import { Jugador } from '../../../src/players/domain/jugador';
import { Liga } from '../../../src/players/domain/liga';
import { TypeOrmPlayersRepository } from '../../../src/players/persistence/typeorm-players.repository';
import { EstadisticasJugadorEntity } from '../../../src/players/persistence/estadisticas-jugador.entity';
import { CatalogoBase } from '../../../src/players/players.repository';
import {
  createPlayersIntegrationApp,
  PlayersIntegrationApp,
} from './players-integration-app';

function catalogo(): CatalogoBase {
  const liga = Liga.crear({
    id: '3f1f8e5f-e2b9-4f4a-9d25-06c248d78e5b',
    proveedorId: 2021,
    codigo: 'PL',
    nombre: 'Premier League',
  });
  const equipoUno = Equipo.crear({
    id: 'd21b7e37-50a7-4da6-bfcb-4f4ecb7b7b99',
    proveedorId: 65,
    ligaId: liga.id,
    nombre: 'Manchester City FC',
  });
  const equipoDos = Equipo.crear({
    id: 'a21b7e37-50a7-4da6-bfcb-4f4ecb7b7b91',
    proveedorId: 66,
    ligaId: liga.id,
    nombre: 'Manchester United FC',
  });
  return {
    ligas: [liga],
    equipos: [equipoUno, equipoDos],
    jugadores: [
      Jugador.crear({
        id: '8f4cf5a8-5b15-4d07-8f89-ecbdeec1f0fc',
        proveedorId: 44,
        equipoId: equipoUno.id,
        nombre: 'Jugador Uno',
      }),
      Jugador.crear({
        id: 'b1b461dd-b3fb-4dc4-b0ad-e2d7adf2a9a8',
        proveedorId: 45,
        equipoId: equipoDos.id,
        nombre: 'Jugador Dos',
      }),
    ],
  };
}

function estadisticas(idJugador: string, idEstadistica: string, goles: number | null) {
  return EstadisticasJugador.crear({
    idEstadistica,
    idJugador,
    goles,
    asistencias: 0,
    tiros: null,
    pasesClave: 2,
    regates: null,
    faltasCometidas: 1.2,
    ratingWhoScored: 7.1,
  });
}

describe('Persistencia de EstadisticasJugador', () => {
  let integration: PlayersIntegrationApp;
  let repository: TypeOrmPlayersRepository;
  let dataSource: DataSource;

  beforeAll(async () => {
    integration = await createPlayersIntegrationApp({ obtenerCatalogo: jest.fn() });
    dataSource = integration.dataSource;
    repository = new TypeOrmPlayersRepository(dataSource);
  });

  beforeEach(async () => {
    await integration.resetData();
  });

  afterAll(async () => integration?.close());

  it('crea la relación FK, permite varias observaciones y conserva 0 frente a NULL', async () => {
    const resultado = await repository.guardarCatalogo(catalogo());
    const jugador = resultado.jugadoresProcesados[0];
    const primera = estadisticas(
      jugador.idJugador,
      '5a1ce1cf-ef4d-4e04-871f-a54c51c3b7db',
      0,
    );
    const segunda = estadisticas(
      jugador.idJugador,
      '6b2de2df-f05e-4f15-9827-b65d62d4c8ec',
      null,
    );

    await repository.guardarEstadisticas(primera);
    await repository.guardarEstadisticas(segunda);

    const rows = await dataSource.getRepository(EstadisticasJugadorEntity).find({
      where: { jugador: { id: jugador.idJugador } },
      relations: { jugador: true },
      order: { id: 'ASC' },
    });
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.goles)).toEqual([0, null]);
    expect(rows.every((row) => row.jugador.id === jugador.idJugador)).toBe(true);
  });

  it('asocia observaciones a jugadores distintos sin cruzar sus IDs', async () => {
    const resultado = await repository.guardarCatalogo(catalogo());
    const [jugadorUno, jugadorDos] = resultado.jugadoresProcesados;

    await repository.guardarEstadisticas(
      estadisticas(jugadorUno.idJugador, '5a1ce1cf-ef4d-4e04-871f-a54c51c3b7db', 1),
    );
    await repository.guardarEstadisticas(
      estadisticas(jugadorDos.idJugador, '6b2de2df-f05e-4f15-9827-b65d62d4c8ec', 2),
    );

    const rows = await dataSource.getRepository(EstadisticasJugadorEntity).find({
      relations: { jugador: true },
    });
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => [row.jugador.id, row.goles])).toEqual(
      expect.arrayContaining([
        [jugadorUno.idJugador, 1],
        [jugadorDos.idJugador, 2],
      ]),
    );
  });

  it('rechaza una estadística cuyo jugador no existe y no crea una fila huérfana', async () => {
    await expect(
      repository.guardarEstadisticas(
        estadisticas(
          '00000000-0000-4000-8000-000000000000',
          '5a1ce1cf-ef4d-4e04-871f-a54c51c3b7db',
          1,
        ),
      ),
    ).rejects.toBeDefined();

    await expect(dataSource.getRepository(EstadisticasJugadorEntity).count()).resolves.toBe(0);
  });
});
