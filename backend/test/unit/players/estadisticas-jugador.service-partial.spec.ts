import { EstadisticasJugadorService } from '../../../src/players/estadisticas-jugador.service';
import { FakePlayersRepository } from './support/fake-players.repository';
import { FakeWhoScoredAdapter } from './support/fake-whoscored.adapter';

describe('estadisticas parciales persistibles', () => {
  it('persiste una unica observacion atomica con null en campos ausentes', async () => {
    const jugadores = new FakePlayersRepository();
    const whoscored = new FakeWhoScoredAdapter();
    whoscored.respuesta = {
      estado: 'exito_parcial',
      metricas: {
        goles: 2,
        asistencias: null,
        tiros: null,
        pasesClave: 1,
        regates: null,
        entradas: null,
        ratingWhoScored: null,
      },
    };
    const servicio = new EstadisticasJugadorService(jugadores, whoscored, jugadores);

    const resultado = await servicio.obtenerEstadisticasJugador('local-1', 'N', 'E', 'L');

    expect(resultado.estado).toBe('exito_parcial');
    expect(jugadores.guardadas).toHaveLength(1);
    expect(jugadores.guardadas[0].idJugador).toBe('local-1');
    expect(jugadores.guardadas[0].asistencias).toBeNull();
    expect(jugadores.guardadas[0].goles).toBe(2);
  });
});
