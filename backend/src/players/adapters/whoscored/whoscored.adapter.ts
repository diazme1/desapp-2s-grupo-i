import type { WhoScoredLookupPort } from '../../estadisticas-jugador.service';
import type {
  WhoScoredHttpResponse,
  WhoScoredIdentidad,
  WhoScoredLookupInput,
  WhoScoredLookupResult,
  WhoScoredMetricas,
  WhoScoredOperationContext,
  WhoScoredTransport,
} from './whoscored.types';

interface SearchCandidate {
  playerId: string;
  slug: string;
  nombre: string;
  equipo: string;
  teamId?: string;
}

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

export class WhoScoredAdapter implements WhoScoredLookupPort {
  constructor(
    private readonly transport: WhoScoredTransport = new FetchWhoScoredTransport(),
    private readonly baseUrl = 'https://www.whoscored.com',
    private readonly requestTimeoutMs = 10_000,
  ) {}

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
    tiros: readCounter(record, 'TotalShots', 'totalShots'),
    pasesClave: readCounter(record, 'KeyPasses', 'keyPasses'),
    regates: readCounter(record, 'Dribbles', 'dribbles'),
    entradas: readCounter(record, 'TotalTackles', 'totalTackles'),
    ratingWhoScored: readRating(record, 'Rating', 'rating'),
  };
}

function readCounter(record: StructuredRecord, ...keys: string[]): number | null {
  const value = readValue(record, keys);
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
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
