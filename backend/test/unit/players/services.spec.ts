import { ServiceUnavailableException } from '@nestjs/common';
import { ActualizarCatalogoService } from '../../../src/players/actualizar-catalogo.service';
import { CatalogoJugadoresService } from '../../../src/players/catalogo-jugadores.service';
import {
  EstadisticasJugadorService,
  ResultadoEstadisticasLiga,
} from '../../../src/players/estadisticas-jugador.service';
import { Equipo } from '../../../src/players/domain/equipo';
import { Jugador } from '../../../src/players/domain/jugador';
import { Liga } from '../../../src/players/domain/liga';
import {
  CatalogoBase,
  JugadorProcesado,
  PlayersRepository,
} from '../../../src/players/players.repository';

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
    nombre: 'Cristiano Ronaldo',
  });
  return { ligas: [liga], equipos: [equipo], jugadores: [jugador] };
}

function jugadorProcesado(idJugador: string, nombreJugador = 'Jugador Uno'): JugadorProcesado {
  return {
    idJugador,
    nombreJugador,
    equipoJugador: 'Equipo Uno',
    ligaEquipoJugador: 'Liga Uno',
  };
}

function crearRepository(): jest.Mocked<PlayersRepository> {
  return {
    guardarCatalogo: jest.fn(),
    existePorId: jest.fn(),
    guardarEstadisticas: jest.fn(),
    listar: jest.fn(),
    buscarPorId: jest.fn(),
  };
}

function crearServicioEstadisticas(
  resultados: ResultadoEstadisticasLiga[],
): { servicio: EstadisticasJugadorService; invocaciones: jest.Mock } {
  const invocaciones = jest.fn(async (_liga: string, jugadores: JugadorProcesado[]) => {
    return resultados.shift() ?? {
      estado: 'completo',
      procesados: jugadores.length,
      exitosos: jugadores.length,
      parciales: 0,
      fallidos: 0,
    };
  });
  return {
    servicio: { actualizarEstadisticasLiga: invocaciones } as unknown as EstadisticasJugadorService,
    invocaciones,
  };
}

function resultado(
  estado: ResultadoEstadisticasLiga['estado'],
  procesados: number,
  exitosos: number,
  parciales: number,
  fallidos: number,
): ResultadoEstadisticasLiga {
  return { estado, procesados, exitosos, parciales, fallidos };
}

describe('Servicios del catálogo de jugadores', () => {
  it('coordina fuente y persistencia y devuelve el resumen con estadísticas completas', async () => {
    const repository = crearRepository();
    repository.guardarCatalogo.mockResolvedValue({
      ligas: 1,
      equipos: 1,
      jugadores: 1,
      jugadoresProcesados: [jugadorProcesado('local-1')],
    });
    const source = { obtenerCatalogo: jest.fn().mockResolvedValue(catalogo()) };
    const { servicio: estadisticasJugador, invocaciones } = crearServicioEstadisticas([
      resultado('completo', 1, 1, 0, 0),
    ]);
    const service = new ActualizarCatalogoService(source, repository, estadisticasJugador);

    await expect(service.ejecutar()).resolves.toMatchObject({
      fuente: 'Football-Data.org',
      ligas: 1,
      equipos: 1,
      jugadores: 1,
      estadisticas: {
        estado: 'completo',
        procesados: 1,
        exitosos: 1,
        parciales: 0,
        fallidos: 0,
      },
    });
    expect(invocaciones).toHaveBeenCalledWith('Liga Uno', [jugadorProcesado('local-1')]);
    expect(repository.guardarCatalogo).toHaveBeenCalledWith(
      expect.objectContaining({ ligas: expect.any(Array) }),
    );
  });

  it('continúa con los siguientes jugadores y calcula un resultado parcial', async () => {
    const repository = crearRepository();
    repository.guardarCatalogo.mockResolvedValue({
      ligas: 1,
      equipos: 2,
      jugadores: 2,
      jugadoresProcesados: [jugadorProcesado('local-1'), jugadorProcesado('local-2', 'Jugador Dos')],
    });
    const { servicio: estadisticasJugador, invocaciones } = crearServicioEstadisticas([
      resultado('parcial', 2, 0, 1, 1),
    ]);
    const service = new ActualizarCatalogoService(
      { obtenerCatalogo: jest.fn().mockResolvedValue(catalogo()) },
      repository,
      estadisticasJugador,
    );

    await expect(service.ejecutar()).resolves.toMatchObject({
      estadisticas: {
        estado: 'parcial',
        procesados: 2,
        exitosos: 0,
        parciales: 1,
        fallidos: 1,
      },
    });
    expect(invocaciones).toHaveBeenCalledTimes(1);
  });

  it('devuelve sin_estadisticas cuando ningún jugador produce una observación persistible', async () => {
    const repository = crearRepository();
    repository.guardarCatalogo.mockResolvedValue({
      ligas: 1,
      equipos: 1,
      jugadores: 1,
      jugadoresProcesados: [jugadorProcesado('local-1')],
    });
    const { servicio: estadisticasJugador } = crearServicioEstadisticas([
      resultado('sin_estadisticas', 1, 0, 0, 1),
    ]);
    const service = new ActualizarCatalogoService(
      { obtenerCatalogo: jest.fn().mockResolvedValue(catalogo()) },
      repository,
      estadisticasJugador,
    );

    await expect(service.ejecutar()).resolves.toMatchObject({
      ligas: 1,
      equipos: 1,
      jugadores: 1,
      estadisticas: {
        estado: 'sin_estadisticas',
        procesados: 1,
        exitosos: 0,
        parciales: 0,
        fallidos: 1,
      },
    });
  });

  it('no invoca estadísticas cuando jugadoresProcesados está vacío', async () => {
    const repository = crearRepository();
    repository.guardarCatalogo.mockResolvedValue({
      ligas: 1,
      equipos: 1,
      jugadores: 0,
      jugadoresProcesados: [],
    });
    const { servicio: estadisticasJugador, invocaciones } = crearServicioEstadisticas([]);
    const service = new ActualizarCatalogoService(
      { obtenerCatalogo: jest.fn().mockResolvedValue(catalogo()) },
      repository,
      estadisticasJugador,
    );

    await expect(service.ejecutar()).resolves.toMatchObject({
      ligas: 1,
      equipos: 1,
      jugadores: 0,
      estadisticas: {
        estado: 'sin_estadisticas',
        procesados: 0,
        exitosos: 0,
        parciales: 0,
        fallidos: 0,
      },
    });
    expect(invocaciones).not.toHaveBeenCalled();
  });

  it('no persiste ni ejecuta estadísticas cuando falla la fuente externa', async () => {
    const repository = crearRepository();
    const { servicio: estadisticasJugador, invocaciones } = crearServicioEstadisticas([]);
    const service = new ActualizarCatalogoService(
      { obtenerCatalogo: jest.fn().mockRejectedValue(new Error('caída')) },
      repository,
      estadisticasJugador,
    );

    await expect(service.ejecutar()).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(repository.guardarCatalogo).not.toHaveBeenCalled();
    expect(invocaciones).not.toHaveBeenCalled();
  });

  it('rechaza el detalle cuando el repository no encuentra el jugador', async () => {
    const repository = crearRepository();
    repository.listar.mockResolvedValue([]);
    repository.buscarPorId.mockResolvedValue(null);
    const service = new CatalogoJugadoresService(repository);

    await expect(service.buscarPorId('8f4cf5a8-5b15-4d07-8f89-ecbdeec1f0fc')).rejects.toThrow('no existe');
  });
});
