import { EstadisticasJugador } from './domain/estadisticas-jugador';
import type {
  WhoScoredLeagueLookupResult,
  WhoScoredMetricas,
  WhoScoredOperationContext,
  WhoScoredPlayerStats,
} from './adapters/whoscored/whoscored.types';
import type { JugadorProcesado } from './players.repository';

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

export interface ResultadoEstadisticasLiga {
  estado: 'completo' | 'parcial' | 'sin_estadisticas';
  procesados: number;
  exitosos: number;
  parciales: number;
  fallidos: number;
  detalle?: string;
}

const DEADLINE = Symbol('deadline');

export class EstadisticasJugadorService {
  constructor(
    private readonly whoscored: WhoScoredLeagueLookupPort,
    private readonly writer: EstadisticasJugadorWriterPort,
    private readonly reloj: () => number = Date.now,
    private readonly deadlineMs = 30_000,
  ) {}

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
    let exitosos = 0;
    let parciales = 0;
    for (const jugador of jugadores) {
      const coincidencias = resultado.jugadores.filter((item) =>
        this.coincideJugador(jugador, item, liga),
      );
      if (coincidencias.length !== 1) continue;

      const estadistica = coincidencias[0];
      if (usados.has(jugador.idJugador) || !this.tieneAlgunaMetrica(estadistica.metricas)) continue;
      try {
        const entidad = EstadisticasJugador.crear({ idJugador: jugador.idJugador, ...estadistica.metricas });
        if (this.reloj() >= deadlineAt) {
          abortController.abort();
          break;
        }
        await this.ejecutarConDeadline(
          () => this.writer.guardar(entidad, context),
          deadlineAt,
          abortController,
        );
        usados.add(jugador.idJugador);
        if (this.esCompleto(estadistica.metricas)) exitosos += 1;
        else parciales += 1;
      } catch {
        // El jugador queda como fallido y el resto de la liga continúa.
      }
    }

    const fallidos = jugadores.length - exitosos - parciales;
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

  private coincideJugador(
    jugador: JugadorProcesado,
    estadistica: WhoScoredPlayerStats,
    liga: string,
  ): boolean {
    return (
      normalizarNombre(jugador.nombreJugador) === normalizarNombre(estadistica.nombre) &&
      normalizarEquipo(jugador.equipoJugador) === normalizarEquipo(estadistica.equipo) &&
      normalizarLiga(jugador.ligaEquipoJugador) === normalizarLiga(estadistica.liga || liga)
    );
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

function normalizarNombre(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizarEquipo(value: string): string {
  const partes = normalizarNombre(value).split(' ');
  const sufijos = ['afc', 'fc', 'cf', 'sc', 'ac'];
  if (sufijos.includes(partes[0])) partes.shift();
  if (sufijos.includes(partes[partes.length - 1])) partes.pop();
  return partes.join(' ');
}

function normalizarLiga(value: string): string {
  const normalized = normalizarNombre(value);
  if (['la liga', 'laliga', 'primera division'].includes(normalized)) return 'la liga';
  return normalized;
}
