import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Equipo } from '../../domain/equipo';
import { Jugador } from '../../domain/jugador';
import { Liga } from '../../domain/liga';
import { CatalogoBase } from '../../players.repository';
import {
  FootballDataCompetition,
  FootballDataPerson,
  FootballDataTeamResponse,
  FootballDataTeamsResponse,
} from './football-data.types';

export const FOOTBALL_DATA_ADAPTER = Symbol('FOOTBALL_DATA_ADAPTER');
export const DEFAULT_FOOTBALL_DATA_COMPETITIONS = ['PL', 'BL1', 'PD', 'SA', 'FL1'];
const MAX_RATE_LIMIT_RETRIES = 3;
const DEFAULT_RATE_LIMIT_WAIT_MS = 2_000;

export interface FootballDataPort {
  obtenerCatalogo(): Promise<CatalogoBase>;
}

export class FootballDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FootballDataError';
  }
}

@Injectable()
export class FootballDataAdapter implements FootballDataPort {
  constructor(private readonly config: ConfigService) {}

  async obtenerCatalogo(): Promise<CatalogoBase> {
    const token = this.config.get<string>('FOOTBALL_DATA_API_TOKEN')?.trim();
    if (!token) throw new FootballDataError('Falta configurar FOOTBALL_DATA_API_TOKEN.');

    const baseUrl = (
      this.config.get<string>('FOOTBALL_DATA_API_URL') ?? 'https://api.football-data.org/v4'
    ).replace(/\/$/, '');
    const competitions = this.competitions();
    const ligas = new Map<number, Liga>();
    const equipos = new Map<number, Equipo>();
    const jugadores = new Map<number, Jugador>();

    for (const code of competitions) {
      const teamsResponse = await this.getJson<FootballDataTeamsResponse>(
        `${baseUrl}/competitions/${encodeURIComponent(code)}/teams`,
        token,
      );
      const competition = this.validarCompetencia(teamsResponse.competition, code);
      if (!Array.isArray(teamsResponse.teams)) {
        throw new FootballDataError(`La respuesta de equipos de ${code} es inválida.`);
      }
      const liga =
        ligas.get(competition.id) ??
        Liga.crear({
          proveedorId: competition.id,
          codigo: competition.code ?? code,
          nombre: competition.name,
          pais: competition.area?.name,
          emblemaUrl: competition.emblem,
        });
      ligas.set(competition.id, liga);

      for (const teamSummary of teamsResponse.teams ?? []) {
        if (equipos.has(teamSummary.id)) continue;
        const team = await this.getJson<FootballDataTeamResponse>(
          `${baseUrl}/teams/${teamSummary.id}`,
          token,
        );
        const equipo = Equipo.crear({
          proveedorId: team.id,
          ligaId: liga.id,
          nombre: team.name,
          nombreCorto: team.shortName,
          sigla: team.tla,
          escudoUrl: team.crest,
        });
        equipos.set(team.id, equipo);
        for (const person of team.squad ?? []) {
          if (person.role && person.role !== 'PLAYER') continue;
          if (jugadores.has(person.id)) continue;
          jugadores.set(person.id, this.aJugador(person, equipo.id));
        }
      }
    }

    return {
      ligas: [...ligas.values()],
      equipos: [...equipos.values()],
      jugadores: [...jugadores.values()],
    };
  }

  private competitions(): string[] {
    const configured = this.config.get<string>('FOOTBALL_DATA_COMPETITIONS');
    const values = (configured ?? DEFAULT_FOOTBALL_DATA_COMPETITIONS.join(','))
      .split(',')
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean);
    if (!values.length) throw new FootballDataError('No hay competencias configuradas.');
    return [...new Set(values)];
  }

  private async getJson<T>(url: string, token: string): Promise<T> {
    for (let attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt += 1) {
      let response: Response;
      try {
        response = await fetch(url, {
          headers: { Accept: 'application/json', 'X-Auth-Token': token },
          signal: AbortSignal.timeout(15_000),
        });
      } catch {
        throw new FootballDataError('No se pudo conectar con Football-Data.org.');
      }
      if (response.status === 429 && attempt < MAX_RATE_LIMIT_RETRIES) {
        await this.esperarRateLimit(response);
        continue;
      }
      if (!response.ok) {
        throw new FootballDataError(`Football-Data.org respondió HTTP ${response.status}.`);
      }
      try {
        return (await response.json()) as T;
      } catch {
        throw new FootballDataError('Football-Data.org devolvió JSON inválido.');
      }
    }
    throw new FootballDataError('Football-Data.org respondió HTTP 429.');
  }

  private async esperarRateLimit(response: Response): Promise<void> {
    let waitMs = DEFAULT_RATE_LIMIT_WAIT_MS;
    try {
      const retryAfterHeader =
        typeof response.headers?.get === 'function' ? response.headers.get('retry-after') : null;
      const retryAfter = Number(retryAfterHeader);
      if (Number.isFinite(retryAfter) && retryAfter > 0) {
        waitMs = retryAfter * 1_000;
      } else if (typeof response.text === 'function') {
        const body = await response.text();
        const match = /wait\s+(\d+)\s+seconds?/i.exec(body);
        if (match) waitMs = Number(match[1]) * 1_000;
      }
    } catch {
      // Use the conservative default when the provider response cannot be inspected.
    }
    await this.esperar(waitMs);
  }

  private esperar(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }

  private validarCompetencia(
    competition: FootballDataCompetition | undefined,
    fallbackCode: string,
  ): FootballDataCompetition {
    if (!competition || !Number.isInteger(competition.id) || competition.id <= 0) {
      throw new FootballDataError(`La respuesta de la competencia ${fallbackCode} es inválida.`);
    }
    return competition;
  }

  private aJugador(person: FootballDataPerson, equipoId: string): Jugador {
    const nombre = person.name?.trim() || [person.firstName, person.lastName].filter(Boolean).join(' ').trim();
    return Jugador.crear({
      proveedorId: person.id,
      equipoId,
      nombre,
      nombreCompleto: person.name,
      posicion: person.position,
      fechaNacimiento: person.dateOfBirth,
      nacionalidad: person.nationality,
    });
  }
}
