import { DataSource } from 'typeorm';
import { Equipo } from '../../../src/players/domain/equipo';
import { EstadisticasJugador } from '../../../src/players/domain/estadisticas-jugador';
import { Jugador } from '../../../src/players/domain/jugador';
import { Liga } from '../../../src/players/domain/liga';
import { TypeOrmPlayersRepository } from '../../../src/players/persistence/typeorm-players.repository';
import { EstadisticasJugadorEntity } from '../../../src/players/persistence/estadisticas-jugador.entity';
import { JugadorEntity } from '../../../src/players/persistence/jugador.entity';
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
    nombre: 'Jugador Uno',
  });
  return { ligas: [liga], equipos: [equipo], jugadores: [jugador] };
}

function crearEstadisticas(idJugador: string, goles: number) {
  return EstadisticasJugador.crear({
    idEstadistica: '5a1ce1cf-ef4d-4e04-871f-a54c51c3b7db',
    idJugador,
    goles,
    asistencias: 1,
    tiros: 2,
    pasesClave: 3,
    regates: 4,
    faltasCometidas: 5.2,
    ratingWhoScored: 7.1,
  });
}

describe('Atomicidad de escritura de EstadisticasJugador', () => {
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

  it('ante un error de escritura no deja una segunda fila parcial ni modifica el jugador', async () => {
    const resultado = await repository.guardarCatalogo(catalogo());
    const idJugador = resultado.jugadoresProcesados[0].idJugador;
    const primera = crearEstadisticas(idJugador, 1);

    await repository.guardarEstadisticas(primera);
    const invalida = crearEstadisticas(idJugador, 2);
    Object.assign(invalida, { goles: -1 });
    await expect(repository.guardarEstadisticas(invalida)).rejects.toBeDefined();

    const filas = await dataSource.getRepository(EstadisticasJugadorEntity).count();
    const jugador = await dataSource.getRepository(JugadorEntity).findOneBy({ id: idJugador });
    expect(filas).toBe(1);
    expect(jugador?.nombre).toBe('Jugador Uno');
  });
});
