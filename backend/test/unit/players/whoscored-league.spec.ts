import { WhoScoredAdapter } from '../../../src/players/adapters/whoscored/whoscored.adapter';
import type {
  WhoScoredHttpResponse,
  WhoScoredLeagueTransport,
  WhoScoredOperationContext,
  WhoScoredTransport,
} from '../../../src/players/adapters/whoscored/whoscored.types';

function context(): WhoScoredOperationContext {
  return { signal: new AbortController().signal, deadlineAt: Date.now() + 30_000 };
}

describe('WhoScoredAdapter por liga', () => {
  it('normaliza las filas JSON del feed de una liga', async () => {
    const transport: WhoScoredLeagueTransport = {
      getLeagueFeed: jest.fn<Promise<WhoScoredHttpResponse>, Parameters<WhoScoredLeagueTransport['getLeagueFeed']>>()
        .mockResolvedValue({
          status: 200,
          body: JSON.stringify({
            playerTableStats: [
              {
                playerId: 10,
                name: 'Jugador Uno',
                teamName: 'Manchester City',
                tournamentName: 'Premier League',
                goal: 2,
                assistTotal: 1,
                shotsPerGame: 4.2,
                keyPassPerGame: 3.1,
                dribbleWonPerGame: 5.4,
                foulsPerGame: 6.2,
                rating: 7.4,
              },
            ],
          }),
        }),
    };
    const httpTransport = { get: jest.fn() } as unknown as WhoScoredTransport;
    const adapter = new WhoScoredAdapter(httpTransport, undefined, undefined, transport);

    await expect(adapter.obtenerEstadisticasLiga('Premier League', context())).resolves.toEqual({
      estado: 'exito',
      jugadores: [
        {
          playerIdExterno: '10',
          nombre: 'Jugador Uno',
          equipo: 'Manchester City',
          liga: 'Premier League',
          metricas: {
            goles: 2,
            asistencias: 1,
            tiros: 4.2,
            pasesClave: 3.1,
            regates: 5.4,
            faltasCometidas: 6.2,
            ratingWhoScored: 7.4,
          },
        },
      ],
    });
  });

  it('rechaza una liga que no tiene configuración', async () => {
    const adapter = new WhoScoredAdapter(
      { get: jest.fn() } as unknown as WhoScoredTransport,
      undefined,
      undefined,
      { getLeagueFeed: jest.fn() },
    );

    await expect(adapter.obtenerEstadisticasLiga('Liga inexistente', context())).resolves.toMatchObject({
      estado: 'liga_no_configurada',
    });
  });
});
