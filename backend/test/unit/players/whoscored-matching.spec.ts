import { WhoScoredAdapter } from '../../../src/players/adapters/whoscored/whoscored.adapter';
import type {
  WhoScoredHttpResponse,
  WhoScoredTransport,
} from '../../../src/players/adapters/whoscored/whoscored.types';

class FixtureTransport implements WhoScoredTransport {
  constructor(private readonly responses: Record<string, WhoScoredHttpResponse>) {}

  async get(url: string): Promise<WhoScoredHttpResponse> {
    const response = Object.entries(this.responses).find(([suffix]) => url.endsWith(suffix))?.[1];
    if (!response) throw new Error(`Fixture inexistente para ${url}`);
    return response;
  }
}

const input = { nombreJugador: 'Jugador', equipoJugador: 'Equipo', ligaEquipoJugador: 'Liga' };
const search = '<tr><td><a href="/players/1/show/jugador">Jugador</a></td><td><a class="team">Equipo</a></td></tr>';

function profile(tournaments: unknown[], currentSeasonId = 2025) {
  return `<script>require.config.params['args'] = ${JSON.stringify({
    playerId: 1,
    currentTeamId: 2,
    currentSeasonId,
    tournaments,
  })};</script>`;
}

function createAdapter(profileBody: string) {
  return new WhoScoredAdapter(new FixtureTransport({
    '/search/?t=Jugador': { status: 200, body: search },
    '/players/1/show/jugador': { status: 200, body: profileBody },
  }), 'https://www.whoscored.com', 10);
}

const record = (seasonId: number, overrides: Record<string, unknown> = {}) => ({
  TournamentName: 'Liga',
  SeasonId: seasonId,
  TeamName: 'Equipo',
  TeamId: 2,
  PlayerId: 1,
  PlayerName: 'Jugador',
  Goals: 1,
  ...overrides,
});

describe('matching de WhoScored', () => {
  it('selecciona liga, equipo, temporada actual y jugador en ese orden', async () => {
    const result = await createAdapter(profile([
      record(2024, { Goals: 99 }),
      record(2025, { Goals: 2 }),
      record(2025, { TournamentName: 'Otra Liga' }),
    ])).obtenerEstadisticas(input, { signal: new AbortController().signal, deadlineAt: Date.now() + 30_000 });

    expect(result.estado).toBe('exito_parcial');
    expect(result.metricas?.goles).toBe(2);
  });

  it('rechaza dos registros igualmente validos como matching ambiguo', async () => {
    const result = await createAdapter(profile([record(2025), record(2025, { StageId: 2 })])).obtenerEstadisticas(
      input,
      { signal: new AbortController().signal, deadlineAt: Date.now() + 30_000 },
    );

    expect(result.estado).toBe('matching_ambiguo');
  });

  it('no combina registros de otra liga o equipo', async () => {
    const result = await createAdapter(profile([
      record(2025, { TournamentName: 'Otra Liga', Goals: 50 }),
      record(2025, { TeamName: 'Otro Equipo', Assists: 50 }),
    ])).obtenerEstadisticas(input, { signal: new AbortController().signal, deadlineAt: Date.now() + 30_000 });

    expect(result.estado).toBe('jugador_no_encontrado');
  });
});
