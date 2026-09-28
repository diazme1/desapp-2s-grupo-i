import { chromium, type Browser } from 'playwright';
import { WhoScoredAdapter } from '../../../src/players/adapters/whoscored/whoscored.adapter';
import type {
  WhoScoredHttpResponse,
  WhoScoredLeagueTransport,
  WhoScoredOperationContext,
} from '../../../src/players/adapters/whoscored/whoscored.types';

function context(deadlineAt = Date.now() + 30_000) {
  return { signal: new AbortController().signal, deadlineAt } satisfies WhoScoredOperationContext;
}

function transport(body: string, status = 200): WhoScoredLeagueTransport {
  return {
    getLeagueFeed: jest.fn<Promise<WhoScoredHttpResponse>, Parameters<WhoScoredLeagueTransport['getLeagueFeed']>>()
      .mockResolvedValue({ status, body }),
  };
}

describe('WhoScoredAdapter: respuestas inválidas y errores', () => {
  it('devuelve fuente_no_disponible cuando el transporte lanza un Error', async () => {
    const adapter = new WhoScoredAdapter({
      getLeagueFeed: jest.fn().mockRejectedValue(new Error('timeout externo')),
    });

    await expect(adapter.obtenerEstadisticasLiga('Premier League', context())).resolves.toEqual({
      estado: 'fuente_no_disponible',
      detalle: 'timeout externo',
    });
  });

  it('usa un detalle genérico cuando el transporte lanza un valor que no es Error', async () => {
    const adapter = new WhoScoredAdapter({
      getLeagueFeed: jest.fn().mockRejectedValue('fallo externo'),
    });

    await expect(adapter.obtenerEstadisticasLiga('Premier League', context())).resolves.toEqual({
      estado: 'fuente_no_disponible',
      detalle: 'No se pudo consultar WhoScored.',
    });
  });

  it('rechaza respuestas HTTP no exitosas', async () => {
    const adapter = new WhoScoredAdapter(transport('rate limited', 429));

    await expect(adapter.obtenerEstadisticasLiga('Premier League', context())).resolves.toEqual({
      estado: 'fuente_no_disponible',
      detalle: 'WhoScored respondio HTTP 429.',
    });
  });

  it.each([
    ['no JSON', 'not-json'],
    ['sin filas reconocibles', JSON.stringify({ other: [] })],
    ['con filas no array', JSON.stringify({ playerTableStats: {} })],
  ])('rechaza un feed %s', async (_caso, body) => {
    const adapter = new WhoScoredAdapter(transport(body));

    await expect(adapter.obtenerEstadisticasLiga('Premier League', context())).resolves.toMatchObject({
      estado: 'estructura_inesperada',
    });
  });

  it.each(['statistics', 'players', 'rows'])('acepta la colección alternativa %s', async (key) => {
    const adapter = new WhoScoredAdapter(
      transport(
        JSON.stringify({
          [key]: [{ playerName: 'Jugador alternativo', teamName: 'Equipo', tournamentName: 'Premier League' }],
        }),
      ),
    );

    await expect(adapter.obtenerEstadisticasLiga('Premier League', context())).resolves.toMatchObject({
      estado: 'exito',
      jugadores: [{ nombre: 'Jugador alternativo', equipo: 'Equipo' }],
    });
  });

  it('ignora filas no objetuales y normaliza aliases, faltantes y valores inválidos', async () => {
    const adapter = new WhoScoredAdapter(
      transport(
        JSON.stringify({
          playerTableStats: [
            null,
            ['fila inválida'],
            { name: '   ' },
            {
              PlayerId: 12,
              playerName: 'Jugador válido',
              TeamName: 'Equipo válido',
              TournamentName: null,
              Goals: '3',
              Assists: '2',
              SpG: '1.236',
              KeyP: 'no-numero',
              Drb: '-1',
              Rating: '8.765',
            },
          ],
        }),
      ),
    );

    await expect(adapter.obtenerEstadisticasLiga('Premier League', context())).resolves.toEqual({
      estado: 'exito',
      jugadores: [
        {
          playerIdExterno: '12',
          nombre: 'Jugador válido',
          equipo: 'Equipo válido',
          liga: 'Premier League',
          metricas: {
            goles: 3,
            asistencias: 2,
            tiros: 1.24,
            pasesClave: null,
            regates: null,
            faltasCometidas: null,
            ratingWhoScored: 8.77,
          },
        },
      ],
    });
  });
});

describe('WhoScoredAdapter: transporte Playwright', () => {
  const environmentKeys = [
    'WHOSCORED_BROWSER_HEADLESS',
    'WHOSCORED_BROWSER_TIMEOUT_MS',
    'WHOSCORED_NUMBER_OF_PLAYERS',
  ];
  const originalEnvironment = Object.fromEntries(
    environmentKeys.map((key) => [key, process.env[key]]),
  );
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    jest.restoreAllMocks();
    globalThis.fetch = originalFetch;
    for (const key of environmentKeys) {
      const value = originalEnvironment[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  function mockBrowser(canonical: string | null) {
    const page = {
      locator: jest.fn().mockReturnValue({ getAttribute: jest.fn().mockResolvedValue(canonical) }),
      setDefaultTimeout: jest.fn(),
      goto: jest.fn().mockResolvedValue(undefined),
      waitForFunction: jest.fn().mockResolvedValue(undefined),
      evaluate: jest.fn().mockImplementation(async (callback, args) => callback(args)),
    };
    const browserContext = {
      newPage: jest.fn().mockResolvedValue(page),
      close: jest.fn().mockResolvedValue(undefined),
    };
    const browser = {
      newContext: jest.fn().mockResolvedValue(browserContext),
      close: jest.fn().mockResolvedValue(undefined),
    };
    jest.spyOn(chromium, 'launch').mockResolvedValue(browser as unknown as Browser);
    return { page, browserContext, browser };
  }

  function mockFetch(responses: Array<{ ok: boolean; status: number; body: string }>) {
    const fetchMock = jest.fn().mockImplementation(async () => {
      const response = responses[Math.min(fetchMock.mock.calls.length - 1, responses.length - 1)];
      return { ok: response.ok, status: response.status, text: async () => response.body };
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    return fetchMock;
  }

  it('descubre la temporada, consulta las cuatro categorías y combina filas por jugador', async () => {
    process.env.WHOSCORED_BROWSER_HEADLESS = 'false';
    process.env.WHOSCORED_BROWSER_TIMEOUT_MS = '1200';
    process.env.WHOSCORED_NUMBER_OF_PLAYERS = '2';
    const { page, browserContext, browser } = mockBrowser(
      'https://es.whoscored.com/Regions/252/Tournaments/2/seasons/2025/stages/1/',
    );
    const fetchMock = mockFetch([
      {
        ok: true,
        status: 200,
        body: JSON.stringify({ playerTableStats: [{ playerId: 1, name: 'Jugador', teamName: 'Equipo' }] }),
      },
      {
        ok: true,
        status: 200,
        body: JSON.stringify({
          playerTableStats: [
            { playerId: 1, tournamentName: 'Premier League', shotsPerGame: 2.345 },
            { name: 'Sin identificador' },
          ],
        }),
      },
      {
        ok: true,
        status: 200,
        body: JSON.stringify({ playerTableStats: [{ playerId: 1, keyPassPerGame: 1.234 }] }),
      },
      {
        ok: true,
        status: 200,
        body: JSON.stringify({ playerTableStats: [{ playerId: 1, rating: 7.456 }] }),
      },
    ]);

    await expect(new WhoScoredAdapter().obtenerEstadisticasLiga('Premier League', context())).resolves.toMatchObject({
      estado: 'exito',
      jugadores: [
        {
          playerIdExterno: '1',
          nombre: 'Jugador',
          equipo: 'Equipo',
          liga: 'Premier League',
          metricas: {
            tiros: 2.35,
            pasesClave: 1.23,
            ratingWhoScored: 7.46,
          },
        },
      ],
    });
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(page.setDefaultTimeout).toHaveBeenCalledWith(1200);
    expect(page.goto).toHaveBeenCalledWith(
      'https://es.whoscored.com/Regions/252/Tournaments/2',
      expect.objectContaining({ waitUntil: 'domcontentloaded', timeout: 1200 }),
    );
    expect(browserContext.close).toHaveBeenCalledTimes(1);
    expect(browser.close).toHaveBeenCalledTimes(1);
  });

  it('usa valores por defecto cuando la configuración de entorno es inválida', async () => {
    process.env.WHOSCORED_BROWSER_HEADLESS = 'invalid';
    process.env.WHOSCORED_BROWSER_TIMEOUT_MS = '0';
    process.env.WHOSCORED_NUMBER_OF_PLAYERS = '-1';
    const { page } = mockBrowser(
      'https://es.whoscored.com/Regions/252/Tournaments/2/seasons/2025/stages/1/',
    );
    mockFetch(
      Array.from({ length: 4 }, () => ({
        ok: true,
        status: 200,
        body: JSON.stringify({ playerTableStats: [] }),
      })),
    );

    await expect(new WhoScoredAdapter().obtenerEstadisticasLiga('Premier League', context(Date.now() + 60_000))).resolves.toEqual({
      estado: 'exito',
      jugadores: [],
    });
    expect(chromium.launch).toHaveBeenCalledWith({ headless: true });
    expect(page.setDefaultTimeout).toHaveBeenCalledWith(45_000);
  });

  it('convierte una respuesta HTTP fallida del feed en fuente_no_disponible', async () => {
    mockBrowser('https://es.whoscored.com/Regions/252/Tournaments/2/seasons/2025/stages/1/');
    mockFetch([{ ok: false, status: 503, body: 'unavailable' }]);

    await expect(new WhoScoredAdapter().obtenerEstadisticasLiga('Premier League', context())).resolves.toEqual({
      estado: 'fuente_no_disponible',
      detalle: 'WhoScored respondio HTTP 503.',
    });
  });

  it.each([
    ['JSON inválido', 'not-json'],
    ['sin jugadores', JSON.stringify({ playerTableStats: {} })],
  ])('clasifica el feed del navegador con %s como inesperado', async (_caso, body) => {
    mockBrowser('https://es.whoscored.com/Regions/252/Tournaments/2/seasons/2025/stages/1/');
    mockFetch([{ ok: true, status: 200, body }]);

    await expect(new WhoScoredAdapter().obtenerEstadisticasLiga('Premier League', context())).resolves.toEqual({
      estado: 'fuente_no_disponible',
      detalle: expect.stringContaining('HTTP 502'),
    });
  });

  it('devuelve fuente_no_disponible si no puede descubrir la temporada vigente', async () => {
    mockBrowser(null);
    mockFetch([]);

    await expect(new WhoScoredAdapter().obtenerEstadisticasLiga('Premier League', context())).resolves.toEqual({
      estado: 'fuente_no_disponible',
      detalle: 'No se pudieron descubrir temporada y stage vigentes de WhoScored.',
    });
  });

  it('respeta un contexto cuyo deadline ya venció y cierra el navegador', async () => {
    const { browserContext, browser } = mockBrowser(
      'https://es.whoscored.com/Regions/252/Tournaments/2/seasons/2025/stages/1/',
    );
    mockFetch([]);

    await expect(
      new WhoScoredAdapter().obtenerEstadisticasLiga('Premier League', context(Date.now() - 1)),
    ).resolves.toMatchObject({
      estado: 'fuente_no_disponible',
      detalle: 'La operacion excedio su deadline.',
    });
    expect(browserContext.close).toHaveBeenCalledTimes(1);
    expect(browser.close).toHaveBeenCalledTimes(1);
  });
});
