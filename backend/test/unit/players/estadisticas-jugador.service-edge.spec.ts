import { EstadisticasJugadorService } from '../../../src/players/estadisticas-jugador.service';
import type {
  EstadisticasJugadorWriterPort,
  WhoScoredLeagueLookupPort,
} from '../../../src/players/estadisticas-jugador.service';
import type {
  WhoScoredMetricas,
  WhoScoredPlayerStats,
} from '../../../src/players/adapters/whoscored/whoscored.types';
import type { JugadorProcesado } from '../../../src/players/players.repository';

const metricasCompletas: WhoScoredMetricas = {
  goles: 1,
  asistencias: 2,
  tiros: 3,
  pasesClave: 4,
  regates: 5,
  faltasCometidas: 6,
  ratingWhoScored: 7,
};

function jugador(idJugador: string): JugadorProcesado {
  return {
    idJugador,
    nombreJugador: `Jugador ${idJugador}`,
    equipoJugador: 'Equipo FC',
    ligaEquipoJugador: 'Premier League',
  };
}

function estadistica(idJugador: string, metricas: WhoScoredMetricas = metricasCompletas): WhoScoredPlayerStats {
  return {
    playerIdExterno: `ws-${idJugador}`,
    nombre: `Jugador ${idJugador}`,
    equipo: 'Equipo',
    liga: 'Premier League',
    metricas,
  };
}

function lookup(resultado: unknown): WhoScoredLeagueLookupPort {
  return { obtenerEstadisticasLiga: jest.fn().mockResolvedValue(resultado) };
}

function writer(): EstadisticasJugadorWriterPort & { guardar: jest.Mock } {
  return { guardar: jest.fn().mockResolvedValue('estadistica-1') };
}

describe('EstadisticasJugadorService: resultados y errores', () => {
  it('no consulta WhoScored cuando no hay jugadores', async () => {
    const whoscored = lookup({ estado: 'exito', jugadores: [] });
    const service = new EstadisticasJugadorService(whoscored, writer());

    await expect(service.actualizarEstadisticasLiga('Premier League', [])).resolves.toEqual({
      estado: 'sin_estadisticas',
      procesados: 0,
      exitosos: 0,
      parciales: 0,
      fallidos: 0,
    });
    expect(whoscored.obtenerEstadisticasLiga).not.toHaveBeenCalled();
  });

  it.each([
    [new Error('WhoScored caído'), 'WhoScored caído'],
    ['fallo no tipado', undefined],
  ])('clasifica una falla del lookup (%s)', async (error, detalle) => {
    const whoscored: WhoScoredLeagueLookupPort = {
      obtenerEstadisticasLiga: jest.fn().mockRejectedValue(error),
    };
    const service = new EstadisticasJugadorService(whoscored, writer());

    await expect(service.actualizarEstadisticasLiga('Premier League', [jugador('1')])).resolves.toEqual({
      estado: 'sin_estadisticas',
      procesados: 1,
      exitosos: 0,
      parciales: 0,
      fallidos: 1,
      ...(detalle ? { detalle } : {}),
    });
  });

  it.each([
    [{ estado: 'fuente_no_disponible', detalle: 'sin conexión' }, 'sin conexión'],
    [{ estado: 'exito' }, undefined],
  ])('clasifica un resultado sin jugadores (%s)', async (resultado, detalle) => {
    const service = new EstadisticasJugadorService(lookup(resultado), writer());

    await expect(service.actualizarEstadisticasLiga('Premier League', [jugador('1')])).resolves.toEqual({
      estado: 'sin_estadisticas',
      procesados: 1,
      exitosos: 0,
      parciales: 0,
      fallidos: 1,
      ...(detalle ? { detalle } : {}),
    });
  });

  it('cuenta una estadística parcial y descarta una observación sin métricas', async () => {
    const metricasParciales = { ...metricasCompletas, ratingWhoScored: null };
    const repository = writer();
    const service = new EstadisticasJugadorService(
      lookup({
        estado: 'exito',
        detalle: 'faltan algunos campos',
        jugadores: [estadistica('1', metricasParciales), estadistica('2', {
          goles: null,
          asistencias: null,
          tiros: null,
          pasesClave: null,
          regates: null,
          faltasCometidas: null,
          ratingWhoScored: null,
        })],
      }),
      repository,
    );

    await expect(service.actualizarEstadisticasLiga('Premier League', [jugador('1'), jugador('2')])).resolves.toEqual({
      estado: 'parcial',
      procesados: 2,
      exitosos: 0,
      parciales: 1,
      fallidos: 1,
      detalle: 'faltan algunos campos',
    });
    expect(repository.guardar).toHaveBeenCalledTimes(1);
  });

  it('continúa con el siguiente jugador cuando falla una persistencia', async () => {
    const repository = writer();
    repository.guardar
      .mockRejectedValueOnce(new Error('fallo de persistencia'))
      .mockResolvedValueOnce('estadistica-2');
    const service = new EstadisticasJugadorService(
      lookup({ estado: 'exito', jugadores: [estadistica('1'), estadistica('2')] }),
      repository,
    );

    await expect(service.actualizarEstadisticasLiga('Premier League', [jugador('1'), jugador('2')])).resolves.toMatchObject({
      estado: 'parcial',
      exitosos: 1,
      parciales: 0,
      fallidos: 1,
    });
  });

  it('ignora coincidencias ambiguas y no duplica un jugador ya guardado', async () => {
    const repository = writer();
    const service = new EstadisticasJugadorService(
      lookup({ estado: 'exito', jugadores: [estadistica('1'), estadistica('1'), estadistica('2')] }),
      repository,
    );

    await expect(
      service.actualizarEstadisticasLiga('Premier League', [jugador('1'), jugador('2'), jugador('2')]),
    ).resolves.toMatchObject({
      estado: 'parcial',
      procesados: 3,
      exitosos: 1,
      parciales: 0,
      fallidos: 2,
    });
    expect(repository.guardar).toHaveBeenCalledTimes(1);
  });

  it('devuelve sin_estadisticas cuando el deadline vence antes de consultar', async () => {
    const reloj = jest.fn().mockReturnValueOnce(100).mockReturnValue(200);
    const whoscored = lookup({ estado: 'exito', jugadores: [] });
    const service = new EstadisticasJugadorService(whoscored, writer(), reloj, 50);

    await expect(service.actualizarEstadisticasLiga('Premier League', [jugador('1')])).resolves.toEqual({
      estado: 'sin_estadisticas',
      procesados: 1,
      exitosos: 0,
      parciales: 0,
      fallidos: 1,
      detalle: 'Se supero el deadline total.',
    });
    expect(whoscored.obtenerEstadisticasLiga).not.toHaveBeenCalled();
  });

  it('detiene el procesamiento si el deadline vence antes de guardar', async () => {
    const reloj = jest.fn()
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(200);
    const repository = writer();
    const service = new EstadisticasJugadorService(
      lookup({ estado: 'exito', jugadores: [estadistica('1')] }),
      repository,
      reloj,
      50,
    );

    await expect(service.actualizarEstadisticasLiga('Premier League', [jugador('1')])).resolves.toMatchObject({
      estado: 'sin_estadisticas',
      exitosos: 0,
      parciales: 0,
      fallidos: 1,
    });
    expect(repository.guardar).not.toHaveBeenCalled();
  });

  it('clasifica como fallida una consulta que excede el deadline', async () => {
    jest.useFakeTimers();
    try {
      const whoscored: WhoScoredLeagueLookupPort = {
        obtenerEstadisticasLiga: jest.fn().mockReturnValue(new Promise(() => undefined)),
      };
      const service = new EstadisticasJugadorService(whoscored, writer(), () => 0, 10);
      const resultado = service.actualizarEstadisticasLiga('Premier League', [jugador('1')]);

      await jest.advanceTimersByTimeAsync(10);
      await expect(resultado).resolves.toMatchObject({
        estado: 'sin_estadisticas',
        procesados: 1,
        exitosos: 0,
        parciales: 0,
        fallidos: 1,
        detalle: 'Se supero el deadline total.',
      });
    } finally {
      jest.useRealTimers();
    }
  });
});
