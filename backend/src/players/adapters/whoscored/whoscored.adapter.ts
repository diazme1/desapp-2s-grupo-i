import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import type {
  WhoScoredLeagueLookupInput,
  WhoScoredLeagueLookupResult,
  WhoScoredLeagueTransport,
  WhoScoredHttpResponse,
  WhoScoredMetricas,
  WhoScoredOperationContext,
  WhoScoredPlayerStats,
} from './whoscored.types';

interface LeagueConfig {
  tournamentId: string;
  regionId: string;
}

const LEAGUE_CONFIGS: Record<string, LeagueConfig> = {
  'premier league': { regionId: '252', tournamentId: '2' },
  bundesliga: { regionId: '81', tournamentId: '3' },
  'la liga': { regionId: '206', tournamentId: '4' },
  'serie a': { regionId: '108', tournamentId: '5' },
  'ligue 1': { regionId: '74', tournamentId: '22' },
};

const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

type StructuredRecord = Record<string, unknown>;

class PlaywrightWhoScoredTransport implements WhoScoredLeagueTransport {
  async getLeagueFeed(
    input: WhoScoredLeagueLookupInput,
    context: WhoScoredOperationContext,
  ): Promise<WhoScoredHttpResponse> {
    const config = resolveLeagueConfig(input.liga);
    if (!config) throw new Error(`No hay configuración de WhoScored para la liga ${input.liga}.`);

    let browser: Browser | undefined;
    let browserContext: BrowserContext | undefined;
    try {
      const executablePath = process.env.WHOSCORED_BROWSER_EXECUTABLE_PATH?.trim() || undefined;
      browser = await chromium.launch({
        headless: readBooleanEnvironment('WHOSCORED_BROWSER_HEADLESS', true),
        ...(executablePath ? { executablePath } : {}),
      });
      browserContext = await browser.newContext({
        locale: 'es-ES',
        userAgent: BROWSER_USER_AGENT,
        viewport: { width: 1440, height: 900 },
      });
      const page = await browserContext.newPage();
      const timeoutMs = Math.min(
        readIntegerEnvironment('WHOSCORED_BROWSER_TIMEOUT_MS', 45_000),
        Math.max(1_000, context.deadlineAt - Date.now()),
      );
      page.setDefaultTimeout(timeoutMs);
      await withDeadline(
        page.goto(buildLeaguePageUrl(config), { waitUntil: 'domcontentloaded', timeout: timeoutMs }),
        context,
      );
      await withDeadline(
        page.waitForFunction(() => document.readyState === 'complete', undefined, { timeout: timeoutMs }),
        context,
      );
      const feedConfig = await withDeadline(discoverCurrentFeedConfig(page), context);
      return await withDeadline(fetchFeedInBrowser(page, feedConfig), context);
    } finally {
      await browserContext?.close().catch(() => undefined);
      await browser?.close().catch(() => undefined);
    }
  }
}

export class WhoScoredAdapter {
  constructor(private readonly leagueTransport: WhoScoredLeagueTransport = new PlaywrightWhoScoredTransport()) {}

  async obtenerEstadisticasLiga(
    liga: string,
    context: WhoScoredOperationContext,
  ): Promise<WhoScoredLeagueLookupResult> {
    if (!resolveLeagueConfig(liga)) {
      return { estado: 'liga_no_configurada', detalle: `No hay configuración de WhoScored para la liga ${liga}.` };
    }

    let response: WhoScoredHttpResponse;
    try {
      response = await this.leagueTransport.getLeagueFeed({ liga }, context);
    } catch (error) {
      return {
        estado: 'fuente_no_disponible',
        detalle: error instanceof Error ? error.message : 'No se pudo consultar WhoScored.',
      };
    }
    if (response.status < 200 || response.status >= 300) {
      return { estado: 'fuente_no_disponible', detalle: `WhoScored respondio HTTP ${response.status}.` };
    }

    const jugadores = parseLeagueFeed(response.body, liga);
    if (!jugadores) {
      return { estado: 'estructura_inesperada', detalle: 'El feed de estadísticas no tiene una estructura reconocida.' };
    }
    return { estado: 'exito', jugadores };
  }
}

interface FeedConfig {
  tournamentId: string;
  seasonId: string;
  stageId: string;
}

async function discoverCurrentFeedConfig(page: Page): Promise<FeedConfig> {
  const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
  const match = canonical?.match(/\/tournaments\/(\d+)\/seasons\/(\d+)\/stages\/(\d+)\//i);
  if (!match) throw new Error('No se pudieron descubrir temporada y stage vigentes de WhoScored.');
  return { tournamentId: match[1], seasonId: match[2], stageId: match[3] };
}

async function fetchFeedInBrowser(page: Page, config: FeedConfig): Promise<WhoScoredHttpResponse> {
  const numberOfPlayers = readIntegerEnvironment('WHOSCORED_NUMBER_OF_PLAYERS', 3_000);
  return page.evaluate(
    async ({ tournamentId, stageId, numberOfPlayers }: {
      tournamentId: string;
      stageId: string;
      numberOfPlayers: number;
    }) => {
      const rowsByPlayerId = new Map<string, Record<string, unknown>>();
      for (const subcategory of ['all', 'offensive', 'passing', 'defensive']) {
        const params = new URLSearchParams({
          category: 'summary',
          subcategory,
          statsAccumulationType: '0',
          isCurrent: 'true',
          playerId: '',
          teamIds: '',
          matchId: '',
          stageId,
          tournamentOptions: tournamentId,
          sortBy: 'Rating',
          sortAscending: '',
          age: '',
          ageComparisonType: '',
          appearances: '',
          appearancesComparisonType: '',
          field: 'Overall',
          positionOptions: '',
          timeOfTheGameEnd: '',
          timeOfTheGameStart: '',
          isMinApp: 'true',
          page: '',
          includeZeroValues: 'true',
          numberOfPlayersToPick: String(numberOfPlayers),
          incPens: '',
        });
        const response = await fetch(`/statisticsfeed/1/getplayerstatistics?${params.toString()}`, {
          credentials: 'include',
          headers: { accept: 'application/json, text/plain, */*' },
        });
        const body = await response.text();
        if (!response.ok) return { status: response.status, body };

        let payload: unknown;
        try {
          payload = JSON.parse(body);
        } catch {
          return { status: 502, body: 'WhoScored devolvio una respuesta no JSON.' };
        }
        const rows =
          payload && typeof payload === 'object' && !Array.isArray(payload) && 'playerTableStats' in payload
            ? (payload.playerTableStats as unknown)
            : null;
        if (!Array.isArray(rows)) return { status: 502, body: 'WhoScored devolvio un feed sin jugadores.' };
        for (const row of rows) {
          if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
          const playerId = String((row as Record<string, unknown>).playerId ?? '');
          if (!playerId) continue;
          rowsByPlayerId.set(
            playerId,
            Object.assign({}, rowsByPlayerId.get(playerId), row as Record<string, unknown>),
          );
        }
      }
      return {
        status: 200,
        body: JSON.stringify({ playerTableStats: [...rowsByPlayerId.values()] }),
      };
    },
    { tournamentId: config.tournamentId, stageId: config.stageId, numberOfPlayers },
  );
}

async function withDeadline<T>(operation: Promise<T>, context: WhoScoredOperationContext): Promise<T> {
  const remaining = context.deadlineAt - Date.now();
  if (remaining <= 0 || context.signal.aborted) throw new Error('La operacion excedio su deadline.');
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('La operacion excedio su deadline.')), remaining);
  });
  try {
    return await Promise.race([operation, deadline]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

function parseLeagueFeed(body: string, fallbackLeague: string): WhoScoredPlayerStats[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }
  const rows = extractFeedRows(parsed);
  if (!rows) return null;
  return rows.filter(isRecord).map((row) => ({
    playerIdExterno: readString(row, 'playerId', 'PlayerId') || undefined,
    nombre: readString(row, 'name', 'playerName', 'PlayerName'),
    equipo: readString(row, 'teamName', 'TeamName'),
    liga: readString(row, 'tournamentName', 'TournamentName') || fallbackLeague,
    metricas: mapFeedMetricas(row),
  })).filter((player) => player.nombre.trim() !== '');
}

function extractFeedRows(value: unknown): unknown[] | null {
  if (Array.isArray(value)) return value;
  if (!isRecord(value)) return null;
  for (const key of ['playerTableStats', 'statistics', 'players', 'rows']) {
    if (Array.isArray(value[key])) return value[key];
  }
  return null;
}

function mapFeedMetricas(record: StructuredRecord): WhoScoredMetricas {
  return {
    goles: readCounter(record, 'goal', 'Goals', 'goals'),
    asistencias: readCounter(record, 'assistTotal', 'Assists', 'assists'),
    tiros: readMetric(record, 'shotsPerGame', 'SpG', 'shots', 'shotsTotal', 'TotalShots', 'totalShots'),
    pasesClave: readMetric(record, 'keyPassPerGame', 'KeyP', 'keyPassTotal', 'keyPasses', 'KeyPasses'),
    regates: readMetric(record, 'dribbleWonPerGame', 'Drb', 'dribbleWon', 'dribbles', 'Dribbles'),
    faltasCometidas: readMetric(record, 'foulsPerGame', 'Fouls', 'foulGivenPerGame'),
    ratingWhoScored: readRating(record, 'rating', 'Rating'),
  };
}

function resolveLeagueConfig(liga: string): LeagueConfig | null {
  const normalized = normalizarLiga(liga);
  return LEAGUE_CONFIGS[normalized] ?? null;
}

function buildLeaguePageUrl(config: LeagueConfig): string {
  return `https://es.whoscored.com/Regions/${config.regionId}/Tournaments/${config.tournamentId}`;
}

function normalizarLiga(value: string): string {
  const normalized = normalizar(value);
  if (['la liga', 'laliga', 'primera division', 'primera división'].includes(normalized)) return 'la liga';
  return normalized;
}

function normalizar(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase();
}

function readIntegerEnvironment(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function readBooleanEnvironment(name: string, fallback: boolean): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

function readCounter(record: StructuredRecord, ...keys: string[]): number | null {
  const value = readValue(record, keys);
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function readMetric(record: StructuredRecord, ...keys: string[]): number | null {
  const value = readValue(record, keys);
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? limitarADosDecimales(parsed) : null;
}

function readRating(record: StructuredRecord, ...keys: string[]): number | null {
  const value = readValue(record, keys);
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? limitarADosDecimales(parsed) : null;
}

function limitarADosDecimales(value: number): number {
  return Number(value.toFixed(2));
}

function readString(record: StructuredRecord, ...keys: string[]): string {
  const value = readValue(record, keys);
  return value === null || value === undefined ? '' : String(value);
}

function readValue(record: StructuredRecord, keys: string[]): unknown {
  for (const key of keys) if (key in record) return record[key];
  return undefined;
}

function isRecord(value: unknown): value is StructuredRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
