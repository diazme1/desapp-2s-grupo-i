import { EstadisticasJugador } from './domain/estadisticas-jugador';
import type {
  WhoScoredLeagueLookupResult,
  WhoScoredMetricas,
  WhoScoredOperationContext,
  WhoScoredPlayerStats,
} from './adapters/whoscored/whoscored.types';
import type { JugadorProcesado } from './players.repository';
import {
  cargarAliasesEquipos,
  normalizarLigaAlias,
  resolverAliasEquipo,
  type TeamAliases,
} from './team-aliases';

export interface EstadisticasJugadorWriterPort {
  guardar(
    estadisticas: EstadisticasJugador,
    context?: WhoScoredOperationContext,
  ): Promise<string>;
}

export interface WhoScoredLeagueLookupPort {
  obtenerEstadisticasLiga(
    liga: string,
    context: WhoScoredOperationContext,
  ): Promise<WhoScoredLeagueLookupResult>;
}

export const MOTIVOS_SIN_MATCH = [
  'sin_match_nombre',
  'sin_match_liga',
  'sin_match_equipo',
  'sin_match_completo',
] as const;

export type MotivoSinMatch = (typeof MOTIVOS_SIN_MATCH)[number];

export interface ResultadoEstadisticasLiga {
  estado: 'completo' | 'parcial' | 'sin_estadisticas';
  procesados: number;
  exitosos: number;
  parciales: number;
  fallidos: number;
  detalle?: string;
  motivoSinMatch?: MotivoSinMatch;
}

const DEADLINE = Symbol('deadline');

export class EstadisticasJugadorService {
  private readonly aliasesEquipos: TeamAliases;

  constructor(
    private readonly whoscored: WhoScoredLeagueLookupPort,
    private readonly writer: EstadisticasJugadorWriterPort,
    private readonly reloj: () => number = Date.now,
    private readonly deadlineMs = 30_000,
    aliasesEquipos: TeamAliases = cargarAliasesEquipos(),
  ) {
    this.aliasesEquipos = aliasesEquipos;
  }

  async actualizarEstadisticasLiga(
    liga: string,
    jugadores: JugadorProcesado[],
  ): Promise<ResultadoEstadisticasLiga> {
    if (jugadores.length === 0) {
      return { estado: 'sin_estadisticas', procesados: 0, exitosos: 0, parciales: 0, fallidos: 0 };
    }

    const deadlineAt = this.reloj() + this.deadlineMs;
    const abortController = new AbortController();
    const context: WhoScoredOperationContext = { signal: abortController.signal, deadlineAt };
    let resultado: WhoScoredLeagueLookupResult | typeof DEADLINE;
    try {
      resultado = await this.ejecutarConDeadline(
        () => this.whoscored.obtenerEstadisticasLiga(liga, context),
        deadlineAt,
        abortController,
      );
    } catch (error) {
      return this.resumenFallido(jugadores.length, error instanceof Error ? error.message : undefined);
    }

    if (resultado === DEADLINE || resultado.estado !== 'exito' || !resultado.jugadores) {
      return this.resumenFallido(
        jugadores.length,
        resultado === DEADLINE ? 'Se supero el deadline total.' : resultado.detalle,
      );
    }

    const usados = new Set<string>();
    const motivosSinMatch = new Set<MotivoSinMatch>();
    let exitosos = 0;
    let parciales = 0;
    for (const jugador of jugadores) {
      const evaluaciones = resultado.jugadores.map((item) =>
        this.evaluarCoincidencia(jugador, item, liga),
      );
      const coincidencias = resultado.jugadores.filter(
        (_item, index) => evaluaciones[index].coincideCompleto,
      );
      if (coincidencias.length !== 1) {
        motivosSinMatch.add(
          coincidencias.length > 1
            ? 'sin_match_completo'
            : this.determinarMotivoSinMatch(evaluaciones),
        );
        continue;
      }

      const estadistica = coincidencias[0];
      if (usados.has(jugador.idJugador) || !this.tieneAlgunaMetrica(estadistica.metricas)) continue;
      try {
        const entidad = EstadisticasJugador.crear({ idJugador: jugador.idJugador, ...estadistica.metricas });
        if (this.reloj() >= deadlineAt) {
          abortController.abort();
          break;
        }
        const guardado = await this.ejecutarConDeadline(
          () => this.writer.guardar(entidad, context),
          deadlineAt,
          abortController,
        );
        if (guardado === DEADLINE) break;
        usados.add(jugador.idJugador);
        if (this.esCompleto(estadistica.metricas)) exitosos += 1;
        else parciales += 1;
      } catch {
        // El jugador queda como fallido y el resto de la liga continúa.
      }
    }

    const fallidos = jugadores.length - exitosos - parciales;
    const motivoSinMatch = resumirMotivosSinMatch(motivosSinMatch);
    return {
      estado:
        exitosos + parciales === 0
          ? 'sin_estadisticas'
          : fallidos > 0 || parciales > 0
            ? 'parcial'
            : 'completo',
      procesados: jugadores.length,
      exitosos,
      parciales,
      fallidos,
      ...(resultado.detalle ? { detalle: resultado.detalle } : {}),
      ...(motivoSinMatch ? { motivoSinMatch } : {}),
    };
  }

  private async ejecutarConDeadline<T>(
    operation: () => Promise<T>,
    deadlineAt: number,
    abortController: AbortController,
  ): Promise<T | typeof DEADLINE> {
    const restante = deadlineAt - this.reloj();
    if (restante <= 0) {
      abortController.abort();
      return DEADLINE;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<typeof DEADLINE>((resolve) => {
      timer = setTimeout(() => {
        abortController.abort();
        resolve(DEADLINE);
      }, restante);
    });

    try {
      return await Promise.race([operation(), deadline]);
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }

  private tieneAlgunaMetrica(metricas: WhoScoredMetricas): boolean {
    return Object.values(metricas).some((valor) => valor !== null);
  }

  private esCompleto(metricas: WhoScoredMetricas): boolean {
    return Object.values(metricas).every((valor) => valor !== null);
  }

  private evaluarCoincidencia(
    jugador: JugadorProcesado,
    estadistica: WhoScoredPlayerStats,
    liga: string,
  ): EvaluacionCoincidencia {
    const nombresEquipo = [
      jugador.equipoJugador,
      ...(jugador.equipoJugadorAlternativos ?? []),
    ];
    const coincideNombre = normalizarNombre(jugador.nombreJugador) === normalizarNombre(estadistica.nombre);
    const coincideEquipo = nombresEquipo.some(
      (nombreEquipo) =>
        normalizarEquipo(nombreEquipo, liga, this.aliasesEquipos) ===
        normalizarEquipo(estadistica.equipo, liga, this.aliasesEquipos),
    );
    const coincideLiga =
      normalizarLigaAlias(jugador.ligaEquipoJugador) ===
      normalizarLigaAlias(estadistica.liga || liga);

    return {
      coincideNombre,
      coincideLiga,
      coincideEquipo,
      coincideCompleto: coincideNombre && coincideLiga && coincideEquipo,
    };
  }

  private determinarMotivoSinMatch(
    evaluaciones: EvaluacionCoincidencia[],
  ): MotivoSinMatch {
    if (!evaluaciones.some((evaluacion) => evaluacion.coincideNombre)) {
      return 'sin_match_nombre';
    }
    if (
      !evaluaciones.some(
        (evaluacion) => evaluacion.coincideNombre && evaluacion.coincideLiga,
      )
    ) {
      return 'sin_match_liga';
    }
    if (
      !evaluaciones.some(
        (evaluacion) =>
          evaluacion.coincideNombre &&
          evaluacion.coincideLiga &&
          evaluacion.coincideEquipo,
      )
    ) {
      return 'sin_match_equipo';
    }
    return 'sin_match_completo';
  }

  private resumenFallido(procesados: number, detalle?: string): ResultadoEstadisticasLiga {
    return {
      estado: 'sin_estadisticas',
      procesados,
      exitosos: 0,
      parciales: 0,
      fallidos: procesados,
      ...(detalle ? { detalle } : {}),
    };
  }
}

interface EvaluacionCoincidencia {
  coincideNombre: boolean;
  coincideLiga: boolean;
  coincideEquipo: boolean;
  coincideCompleto: boolean;
}

export function resumirMotivosSinMatch(
  motivos: Iterable<MotivoSinMatch>,
): MotivoSinMatch | undefined {
  const motivosUnicos = new Set(motivos);
  if (motivosUnicos.size === 0) return undefined;
  if (motivosUnicos.size === 1) return [...motivosUnicos][0];
  return 'sin_match_completo';
}

function normalizarNombre(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizarEquipo(value: string, liga: string, aliases: TeamAliases): string {
  return resolverAliasEquipo(value, liga, aliases);
}
