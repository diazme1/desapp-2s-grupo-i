import type { WhoScoredLookupPort } from '../../estadisticas-jugador.service';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import type {
  WhoScoredLeagueLookupInput,
  WhoScoredLeagueLookupResult,
  WhoScoredLeagueTransport,
  WhoScoredHttpResponse,
  WhoScoredIdentidad,
  WhoScoredLookupInput,
  WhoScoredLookupResult,
  WhoScoredMetricas,
  WhoScoredOperationContext,
  WhoScoredPlayerStats,
  WhoScoredTransport,
} from './whoscored.types';

export const WHO_SCORED_LOOKUP = Symbol('WHO_SCORED_LOOKUP');

interface SearchCandidate {
  playerId: string;
  slug: string;
  nombre: string;
  equipo: string;
  teamId?: string;
}

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

class FetchWhoScoredTransport implements WhoScoredTransport {
  async get(url: string, signal: AbortSignal): Promise<WhoScoredHttpResponse> {
    const response = await fetch(url, {
      signal,
      headers: {
        accept: 'text/html,application/xhtml+xml',
        'user-agent': 'desapp-whoscored-adapter/1.0',
      },
    });
    return { status: response.status, body: await response.text() };
  }
}

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

export class WhoScoredAdapter implements WhoScoredLookupPort {
  constructor(
    private readonly transport: WhoScoredTransport = new FetchWhoScoredTransport(),
    private readonly baseUrl = 'https://www.whoscored.com',
    private readonly requestTimeoutMs = 10_000,
    private readonly leagueTransport: WhoScoredLeagueTransport = new PlaywrightWhoScoredTransport(),
  ) {}

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

  async obtenerEstadisticas(
    input: WhoScoredLookupInput,
    context: WhoScoredOperationContext,
  ): Promise<WhoScoredLookupResult> {
    if (!input.nombreJugador.trim() || !input.equipoJugador.trim() || !input.ligaEquipoJugador.trim()) {
      return { estado: 'estructura_inesperada', detalle: 'Faltan datos para identificar al jugador.' };
    }

    let searchResponse: WhoScoredHttpResponse;
    try {
      searchResponse = await this.request(
        `${this.baseUrl}/search/?t=${encodeURIComponent(input.nombreJugador)}`,
        context,
      );
    } catch (error) {
      return { estado: 'fuente_no_disponible', detalle: this.detalleError(error) };
    }
    if (searchResponse.status < 200 || searchResponse.status >= 300) {
      return { estado: 'fuente_no_disponible', detalle: `WhoScored respondio HTTP ${searchResponse.status}.` };
    }

    const candidatos = parseSearchCandidates(searchResponse.body)
      .filter((candidate) => normalizar(candidate.nombre) === normalizar(input.nombreJugador))
      .filter((candidate) => !candidate.equipo || normalizar(candidate.equipo) === normalizar(input.equipoJugador));
    if (candidatos.length === 0) return { estado: 'jugador_no_encontrado' };

    const matches: Array<{ identidad: WhoScoredIdentidad; metricas: WhoScoredMetricas }> = [];
    for (const candidate of candidatos) {
      let profileResponse: WhoScoredHttpResponse;
      try {
        profileResponse = await this.request(
          `${this.baseUrl}/players/${candidate.playerId}/show/${candidate.slug}`,
          context,
        );
      } catch (error) {
        return { estado: 'fuente_no_disponible', detalle: this.detalleError(error) };
      }
      if (profileResponse.status < 200 || profileResponse.status >= 300) {
        return { estado: 'fuente_no_disponible', detalle: `WhoScored respondio HTTP ${profileResponse.status}.` };
      }

      const payload = parseStructuredPayload(profileResponse.body);
      if (!payload) {
        return { estado: 'estructura_inesperada', detalle: 'No se encontro el payload estructurado del perfil.' };
      }
      const selection = selectTournamentRecord(payload, candidate, input);
      if (selection === 'ambiguous') return { estado: 'matching_ambiguo' };
      if (!selection) continue;

      const metricas = mapMetricas(selection.record);
      if (!Object.values(metricas).some((value) => value !== null)) {
        matches.push({
          identidad: buildIdentity(selection.record, candidate, input),
          metricas,
        });
        continue;
      }
      matches.push({
        identidad: buildIdentity(selection.record, candidate, input),
        metricas,
      });
    }

    if (matches.length === 0) return { estado: 'jugador_no_encontrado' };
    if (matches.length > 1) return { estado: 'matching_ambiguo' };

    const [match] = matches;
    const estado = Object.values(match.metricas).every((value) => value !== null)
      ? 'exito_completo'
      : Object.values(match.metricas).some((value) => value !== null)
        ? 'exito_parcial'
        : 'sin_estadisticas';
    return { estado, identidad: match.identidad, metricas: match.metricas };
  }

  private async request(url: string, context: WhoScoredOperationContext): Promise<WhoScoredHttpResponse> {
    const remaining = context.deadlineAt - Date.now();
    if (remaining <= 0 || context.signal.aborted) throw new Error('La operacion excedio su deadline.');

    const controller = new AbortController();
    const abortParent = () => controller.abort();
    context.signal.addEventListener('abort', abortParent, { once: true });
    const timeoutMs = Math.min(this.requestTimeoutMs, remaining);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new Error('La request a WhoScored excedio el timeout.'));
      }, timeoutMs);
    });
    try {
      return await Promise.race([this.transport.get(url, controller.signal), timeout]);
    } finally {
      if (timer !== undefined) clearTimeout(timer);
      context.signal.removeEventListener('abort', abortParent);
    }
  }

  private detalleError(error: unknown): string {
    return error instanceof Error ? error.message : 'No se pudo consultar WhoScored.';
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

function parseSearchCandidates(html: string): SearchCandidate[] {
  const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((match) => match[1]);
  const sections = rows.length > 0 ? rows : [html];
  const candidates: SearchCandidate[] = [];
  for (const section of sections) {
    const player = section.match(/href=["']\/players\/(\d+)\/show\/([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
    if (!player) continue;
    const team = section.match(/href=["']\/teams\/(\d+)\/show\/[^"']+["'][^>]*>([\s\S]*?)<\/a>/i)
      ?? section.match(/class=["'][^"']*team[^"']*["'][^>]*>([\s\S]*?)<\/a>/i);
    candidates.push({
      playerId: player[1],
      slug: player[2],
      nombre: cleanText(player[3]),
      equipo: cleanText(team?.[2] ?? team?.[1] ?? ''),
      ...(team?.[1] && /^\d+$/.test(team[1]) ? { teamId: team[1] } : {}),
    });
  }
  return candidates;
}

function parseStructuredPayload(html: string): StructuredRecord | null {
  const marker = html.indexOf("require.config.params['args']");
  if (marker < 0) return null;
  const objectStart = html.indexOf('{', marker);
  if (objectStart < 0) return null;
  const objectText = extractBalanced(html, objectStart, '{', '}');
  if (!objectText) return null;
  try {
    const parsed: unknown = JSON.parse(objectText);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return parseJavaScriptObject(objectText);
  }
}

function parseJavaScriptObject(text: string): StructuredRecord | null {
  const tournamentsStart = text.search(/(?:["']?tournaments["']?)\s*:/i);
  if (tournamentsStart < 0) return null;
  const arrayStart = text.indexOf('[', tournamentsStart);
  const arrayText = arrayStart >= 0 ? extractBalanced(text, arrayStart, '[', ']') : null;
  if (!arrayText) return null;
  const tournaments = splitObjects(arrayText).map(parseRecord).filter(isRecord);
  const result: StructuredRecord = { tournaments };
  for (const key of ['playerId', 'currentTeamId', 'currentSeasonId', 'seasonId']) {
    const value = readProperty(text, key);
    if (value !== undefined) result[key] = value;
  }
  return result;
}

function selectTournamentRecord(
  payload: StructuredRecord,
  candidate: SearchCandidate,
  input: WhoScoredLookupInput,
): { record: StructuredRecord } | 'ambiguous' | null {
  const rawTournaments = payload.tournaments;
  if (!Array.isArray(rawTournaments)) return null;
  const tournaments = rawTournaments.filter(isRecord);
  const byLeague = tournaments.filter(
    (record) => normalizar(readString(record, 'TournamentName', 'tournamentName')) === normalizar(input.ligaEquipoJugador),
  );
  const byTeam = byLeague.filter((record) => {
    const teamName = readString(record, 'TeamName', 'teamName');
    const teamId = readString(record, 'TeamId', 'teamId');
    const currentTeamId = readString(payload, 'currentTeamId');
    const candidateTeamMatches = !candidate.teamId || !teamId || candidate.teamId === teamId;
    const currentTeamMatches = !currentTeamId || !teamId || currentTeamId === teamId;
    return normalizar(teamName) === normalizar(input.equipoJugador) && candidateTeamMatches && currentTeamMatches;
  });
  if (byTeam.length === 0) return null;

  const explicitSeason = readString(payload, 'currentSeasonId', 'seasonId');
  let bySeason = explicitSeason
    ? byTeam.filter((record) => readString(record, 'SeasonId', 'seasonId') === explicitSeason)
    : byTeam;
  if (!explicitSeason) {
    const seasons = byTeam
      .map((record) => Number(readString(record, 'SeasonId', 'seasonId')))
      .filter((season) => Number.isFinite(season));
    if (seasons.length === 0) return null;
    const currentSeason = Math.max(...seasons);
    bySeason = byTeam.filter((record) => Number(readString(record, 'SeasonId', 'seasonId')) === currentSeason);
  }

  const byPlayer = bySeason.filter((record) => {
    const playerId = readString(record, 'PlayerId', 'playerId');
    const playerName = readString(record, 'PlayerName', 'Name', 'name');
    return playerId === candidate.playerId && normalizar(playerName) === normalizar(input.nombreJugador);
  });
  if (byPlayer.length > 1) return 'ambiguous';
  return byPlayer.length === 1 ? { record: byPlayer[0] } : null;
}

function buildIdentity(
  record: StructuredRecord,
  candidate: SearchCandidate,
  input: WhoScoredLookupInput,
): WhoScoredIdentidad {
  return {
    playerIdExterno: readString(record, 'PlayerId', 'playerId') || candidate.playerId,
    nombre: readString(record, 'PlayerName', 'Name', 'name') || input.nombreJugador,
    equipo: readString(record, 'TeamName', 'teamName') || input.equipoJugador,
    liga: readString(record, 'TournamentName', 'tournamentName') || input.ligaEquipoJugador,
  };
}

function mapMetricas(record: StructuredRecord): WhoScoredMetricas {
  return {
    goles: readCounter(record, 'Goals', 'goals'),
    asistencias: readCounter(record, 'Assists', 'assists'),
    tiros: readMetric(record, 'shotsPerGame', 'SpG', 'TotalShots', 'totalShots'),
    pasesClave: readMetric(record, 'keyPassPerGame', 'KeyP', 'KeyPasses', 'keyPasses'),
    regates: readMetric(record, 'dribbleWonPerGame', 'Drb', 'Dribbles', 'dribbles'),
    faltasCometidas: readMetric(record, 'foulsPerGame', 'Fouls', 'foulGivenPerGame'),
    ratingWhoScored: readRating(record, 'Rating', 'rating'),
  };
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
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function readRating(record: StructuredRecord, ...keys: string[]): number | null {
  const value = readValue(record, keys);
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function readString(record: StructuredRecord, ...keys: string[]): string {
  const value = readValue(record, keys);
  return value === null || value === undefined ? '' : String(value);
}

function readValue(record: StructuredRecord, keys: string[]): unknown {
  for (const key of keys) if (key in record) return record[key];
  return undefined;
}

function parseRecord(text: string): StructuredRecord | null {
  const record: StructuredRecord = {};
  for (const match of text.matchAll(/(?:["']?([A-Za-z][A-Za-z0-9_]*)["']?)\s*:\s*("([^"]*)"|'([^']*)'|(-?\d+(?:\.\d+)?)|null|true|false)/g)) {
    record[match[1]] = match[3] ?? match[4] ?? (match[5] !== undefined ? Number(match[5]) : match[0].endsWith('true'));
    if (match[0].endsWith('null')) record[match[1]] = null;
    if (match[0].endsWith('false')) record[match[1]] = false;
  }
  return record;
}

function readProperty(text: string, key: string): unknown {
  const match = text.match(new RegExp(`(?:["']?${key}["']?)\\s*:\\s*("([^"]*)"|'([^']*)'|(-?\\d+(?:\\.\\d+)?)|null)`));
  if (!match) return undefined;
  return match[2] ?? match[3] ?? (match[4] !== undefined ? Number(match[4]) : null);
}

function splitObjects(arrayText: string): string[] {
  const result: string[] = [];
  let start = -1;
  let depth = 0;
  for (let index = 0; index < arrayText.length; index += 1) {
    if (arrayText[index] === '{') {
      if (depth === 0) start = index;
      depth += 1;
    } else if (arrayText[index] === '}') {
      depth -= 1;
      if (depth === 0 && start >= 0) result.push(arrayText.slice(start, index + 1));
    }
  }
  return result;
}

function extractBalanced(text: string, start: number, opening: string, closing: string): string | null {
  let depth = 0;
  let quote: string | null = null;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (quote) {
      if (char === quote && text[index - 1] !== '\\') quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === opening) depth += 1;
    if (char === closing) {
      depth -= 1;
      if (depth === 0) return text.slice(start, index + 1);
    }
  }
  return null;
}

function cleanText(value: string): string {
  return value.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

function normalizar(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase();
}

function isRecord(value: unknown): value is StructuredRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
