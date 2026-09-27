import { EstadisticasJugadorService } from '../../../src/players/estadisticas-jugador.service';
import { FakePlayersRepository } from './support/fake-players.repository';
import { FakeWhoScoredAdapter } from './support/fake-whoscored.adapter';

describe('deadline total del caso de uso', () => {
  afterEach(() => jest.useRealTimers());

  it('finaliza a los 30 segundos simulados, no persiste y no deja la operacion pendiente', async () => {
    jest.useFakeTimers();
    const jugadores = new FakePlayersRepository();
    const whoscored = new FakeWhoScoredAdapter();
    whoscored.promesaPendiente = true;
    const servicio = new EstadisticasJugadorService(jugadores, whoscored, jugadores);

    const operacion = servicio.obtenerEstadisticasJugador('local-1', 'N', 'E', 'L');
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(whoscored.ultimaEntrada).toEqual({ nombreJugador: 'N', equipoJugador: 'E', ligaEquipoJugador: 'L' });
    jest.advanceTimersByTime(30_001);

    await expect(operacion).resolves.toMatchObject({
      estado: 'fuente_no_disponible',
      idJugador: 'local-1',
    });
    expect(whoscored.abortoRecibido).toBe(true);
    expect(jugadores.guardadas).toHaveLength(0);
  });
});
