import { EstadisticasJugadorService } from '../../../src/players/estadisticas-jugador.service';
import type { WhoScoredLeagueLookupPort } from '../../../src/players/estadisticas-jugador.service';
import { FakePlayersRepository } from './support/fake-players.repository';

describe('EstadisticasJugadorService por liga', () => {
  it('persiste solo jugadores locales que coinciden con el feed', async () => {
    const repository = new FakePlayersRepository();
    const whoscored: WhoScoredLeagueLookupPort = {
      obtenerEstadisticasLiga: jest.fn().mockResolvedValue({
        estado: 'exito',
        jugadores: [
          {
            playerIdExterno: 'ws-1',
            nombre: 'Jugador Uno',
            equipo: 'Manchester City',
            liga: 'LaLiga',
            metricas: {
              goles: 2,
              asistencias: 1,
              tiros: 3,
              pasesClave: 4,
              regates: 5,
              faltasCometidas: 6.1,
              ratingWhoScored: 7.1,
            },
          },
          {
            playerIdExterno: 'ws-unknown',
            nombre: 'Jugador Externo',
            equipo: 'Otro Equipo',
            liga: 'LaLiga',
            metricas: {
              goles: 9,
              asistencias: null,
              tiros: null,
              pasesClave: null,
              regates: null,
              faltasCometidas: null,
              ratingWhoScored: null,
            },
          },
        ],
      }),
    };
    const service = new EstadisticasJugadorService(
      repository,
      whoscored as never,
      repository,
      Date.now,
      30_000,
      whoscored,
    );

    await expect(
      service.actualizarEstadisticasLiga('Primera Division', [
        {
          idJugador: 'local-1',
          nombreJugador: 'Jugador Uno',
          equipoJugador: 'Manchester City FC',
          ligaEquipoJugador: 'Primera Division',
        },
        {
          idJugador: 'local-2',
          nombreJugador: 'Jugador Dos',
          equipoJugador: 'Manchester United FC',
          ligaEquipoJugador: 'Primera Division',
        },
      ]),
    ).resolves.toMatchObject({
      estado: 'parcial',
      procesados: 2,
      exitosos: 1,
      parciales: 0,
      fallidos: 1,
    });

    expect(repository.guardadas).toHaveLength(1);
    expect(repository.guardadas[0]).toMatchObject({ idJugador: 'local-1', goles: 2 });
  });
});
