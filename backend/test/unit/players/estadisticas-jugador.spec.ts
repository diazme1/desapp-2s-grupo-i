import { EstadisticasJugador } from '../../../src/players/domain/estadisticas-jugador';

describe('EstadisticasJugador', () => {
  const metricas = {
    goles: 0,
    asistencias: null,
    tiros: 2,
    pasesClave: null,
    regates: 1,
    entradas: null,
    ratingWhoScored: 0,
  };

  it('preserva cero y permite metricas ausentes cuando existe al menos una metrica', () => {
    const estadisticas = EstadisticasJugador.crear({ idJugador: 'jugador-1', ...metricas });

    expect(estadisticas.goles).toBe(0);
    expect(estadisticas.ratingWhoScored).toBe(0);
    expect(estadisticas.asistencias).toBeNull();
  });

  it('rechaza una observacion sin metricas recuperables', () => {
    expect(() =>
      EstadisticasJugador.crear({
        idJugador: 'jugador-1',
        goles: null,
        asistencias: null,
        tiros: null,
        pasesClave: null,
        regates: null,
        entradas: null,
        ratingWhoScored: null,
      }),
    ).toThrow('al menos una estadistica');
  });

  it('rechaza contadores negativos o fraccionarios', () => {
    expect(() => EstadisticasJugador.crear({ idJugador: 'jugador-1', ...metricas, goles: -1 })).toThrow();
    expect(() => EstadisticasJugador.crear({ idJugador: 'jugador-1', ...metricas, tiros: 1.5 })).toThrow();
  });

  it('requiere un idJugador no vacio y un rating finito no negativo', () => {
    expect(() => EstadisticasJugador.crear({ idJugador: ' ', ...metricas })).toThrow();
    expect(() =>
      EstadisticasJugador.crear({ idJugador: 'jugador-1', ...metricas, ratingWhoScored: Number.NaN }),
    ).toThrow();
  });
});
