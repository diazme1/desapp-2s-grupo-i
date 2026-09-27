import { readFileSync } from 'node:fs';
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

function context() {
  return { signal: new AbortController().signal, deadlineAt: Date.now() + 30_000 };
}

function adapterWith(profile: string, search = 'search-raphinha.html') {
  const searchBody = readFileSync(`${__dirname}/fixtures/whoscored/${search}`, 'utf8');
  return new WhoScoredAdapter(
    new FixtureTransport({
      '/search/?t=Raphinha': { status: 200, body: searchBody },
      '/players/300447/show/raphinha': { status: 200, body: profile },
    }),
    'https://www.whoscored.com',
    10,
  );
}

describe('WhoScoredAdapter mapping', () => {
  it('extrae el payload estructurado y normaliza las siete metricas', async () => {
    const profile = readFileSync(`${__dirname}/fixtures/whoscored/profile-raphinha.html`, 'utf8');
    const result = await adapterWith(profile).obtenerEstadisticas(
      { nombreJugador: 'Raphinha', equipoJugador: 'Barcelona', ligaEquipoJugador: 'LaLiga' },
      context(),
    );

    expect(result).toMatchObject({
      estado: 'exito_completo',
      identidad: { playerIdExterno: '300447', nombre: 'Raphinha', equipo: 'Barcelona', liga: 'LaLiga' },
      metricas: {
        goles: 12,
        asistencias: 3,
        tiros: 2.5,
        pasesClave: 1.4,
        regates: 1.2,
        faltasCometidas: 4.2,
        ratingWhoScored: 8.948571428571428,
      },
    });
  });

  it('preserva cero y distingue campos ausentes', async () => {
    const profile = readFileSync(`${__dirname}/fixtures/whoscored/profile-raphinha.html`, 'utf8')
      .replaceAll('Raphinha', 'Raphinha')
      .replace(/Goals": 12/, 'Goals": 0')
      .replace(/Assists": 3/, 'Assists": null')
      .replace(/shotsPerGame": 2.5/, 'shotsPerGame": ""')
      .replace(/keyPassPerGame": 1.4/, 'keyPassPerGame": 1')
      .replace(/dribbleWonPerGame": 1.2/, 'dribbleWonPerGame": null')
      .replace(/foulsPerGame": 4.2/, 'foulsPerGame": null')
      .replace(/Rating": 8\.948571428571428/, 'Rating": 0');
    const result = await adapterWith(profile).obtenerEstadisticas(
      { nombreJugador: 'Raphinha', equipoJugador: 'Barcelona', ligaEquipoJugador: 'LaLiga' },
      context(),
    );

    expect(result.estado).toBe('exito_parcial');
    expect(result.metricas).toEqual({
      goles: 0,
      asistencias: null,
      tiros: null,
      pasesClave: 1,
      regates: null,
      faltasCometidas: null,
      ratingWhoScored: 0,
    });
  });

  it('clasifica una estructura sin payload como inesperada', async () => {
    const profile = readFileSync(`${__dirname}/fixtures/whoscored/profile-unexpected-structure.html`, 'utf8');
    const result = await adapterWith(profile).obtenerEstadisticas(
      { nombreJugador: 'Raphinha', equipoJugador: 'Barcelona', ligaEquipoJugador: 'LaLiga' },
      context(),
    );

    expect(result.estado).toBe('estructura_inesperada');
  });
});
