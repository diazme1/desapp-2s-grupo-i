import { EstadisticasJugador } from './domain/estadisticas-jugador';
import type {
  WhoScoredLookupInput,
  WhoScoredLookupResult,
  WhoScoredMetricas,
  WhoScoredOperationContext,
} from './adapters/whoscored/whoscored.types';

export interface JugadorLookupPort {
  existePorId(idJugador: string): Promise<boolean | { idJugador: string } | null>;
}

export interface EstadisticasJugadorWriterPort {
  guardar(
    estadisticas: EstadisticasJugador,
    context?: WhoScoredOperationContext,
  ): Promise<string>;
}

export interface WhoScoredLookupPort {
  obtenerEstadisticas(
    input: WhoScoredLookupInput,
    context: WhoScoredOperationContext,
  ): Promise<WhoScoredLookupResult>;
}

export interface ResultadoEstadisticasJugador {
  estado:
    | 'exito_completo'
    | 'exito_parcial'
    | 'jugador_local_inexistente'
    | 'jugador_no_encontrado'
    | 'matching_ambiguo'
    | 'fuente_no_disponible'
    | 'estructura_inesperada'
    | 'sin_estadisticas'
    | 'error_persistencia';
  idJugador: string;
  idEstadistica?: string;
  metricas?: WhoScoredMetricas;
  detalle?: string;
}

const DEADLINE = Symbol('deadline');

export class EstadisticasJugadorService {
  constructor(
    private readonly jugadorLookup: JugadorLookupPort,
    private readonly whoscored: WhoScoredLookupPort,
    private readonly writer: EstadisticasJugadorWriterPort,
    private readonly reloj: () => number = Date.now,
    private readonly deadlineMs = 30_000,
  ) {}

  async obtenerEstadisticasJugador(
    idJugador: string,
    nombreJugador: string,
    equipoJugador: string,
    ligaEquipoJugador: string,
  ): Promise<ResultadoEstadisticasJugador> {
    const idNormalizado = idJugador.trim();
    const deadlineAt = this.reloj() + this.deadlineMs;
    const abortController = new AbortController();
    const context: WhoScoredOperationContext = {
      signal: abortController.signal,
      deadlineAt,
    };

    const jugador = await this.ejecutarConDeadline(
      () => this.jugadorLookup.existePorId(idNormalizado),
      deadlineAt,
      abortController,
    );
    if (jugador === DEADLINE) {
      return this.resultado(idNormalizado, 'fuente_no_disponible', 'Se supero el deadline total.');
    }
    if (!jugador) {
      return this.resultado(idNormalizado, 'jugador_local_inexistente');
    }

    let resultadoWhoScored: WhoScoredLookupResult | typeof DEADLINE;
    try {
      resultadoWhoScored = await this.ejecutarConDeadline(
        () =>
          this.whoscored.obtenerEstadisticas(
            { nombreJugador, equipoJugador, ligaEquipoJugador },
            context,
          ),
        deadlineAt,
        abortController,
      );
    } catch (error) {
      return this.resultado(
        idNormalizado,
        'fuente_no_disponible',
        error instanceof Error ? error.message : 'No se pudo consultar WhoScored.',
      );
    }
    if (resultadoWhoScored === DEADLINE) {
      return this.resultado(idNormalizado, 'fuente_no_disponible', 'Se supero el deadline total.');
    }

    if (!this.esResultadoExitoso(resultadoWhoScored)) {
      return this.resultado(
        idNormalizado,
        resultadoWhoScored.estado,
        resultadoWhoScored.detalle,
        resultadoWhoScored.metricas,
      );
    }

    const metricas = resultadoWhoScored.metricas;
    if (!metricas || !this.tieneAlgunaMetrica(metricas)) {
      return this.resultado(
        idNormalizado,
        'sin_estadisticas',
        'No se recupero ninguna estadistica requerida.',
        metricas,
      );
    }

    let estadisticas: EstadisticasJugador;
    try {
      estadisticas = EstadisticasJugador.crear({ idJugador: idNormalizado, ...metricas });
    } catch (error) {
      return this.resultado(
        idNormalizado,
        'estructura_inesperada',
        error instanceof Error ? error.message : 'Las metricas no son validas.',
        metricas,
      );
    }

    if (this.reloj() >= deadlineAt) {
      abortController.abort();
      return this.resultado(idNormalizado, 'fuente_no_disponible', 'Se supero el deadline total.');
    }

    let idEstadistica: string | typeof DEADLINE;
    try {
      idEstadistica = await this.ejecutarConDeadline(
        () => this.writer.guardar(estadisticas, context),
        deadlineAt,
        abortController,
      );
    } catch (error) {
      return this.resultado(
        idNormalizado,
        'error_persistencia',
        error instanceof Error ? error.message : 'No se pudieron persistir las estadisticas.',
        metricas,
      );
    }
    if (idEstadistica === DEADLINE) {
      return this.resultado(idNormalizado, 'fuente_no_disponible', 'Se supero el deadline total.', metricas);
    }

    return {
      estado: this.esCompleto(metricas) ? 'exito_completo' : 'exito_parcial',
      idJugador: idNormalizado,
      idEstadistica,
      metricas,
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

  private esResultadoExitoso(
    result: WhoScoredLookupResult,
  ): result is WhoScoredLookupResult & { metricas: WhoScoredMetricas } {
    return result.estado === 'exito_completo' || result.estado === 'exito_parcial';
  }

  private tieneAlgunaMetrica(metricas: WhoScoredMetricas): boolean {
    return Object.values(metricas).some((valor) => valor !== null);
  }

  private esCompleto(metricas: WhoScoredMetricas): boolean {
    return Object.values(metricas).every((valor) => valor !== null);
  }

  private resultado(
    idJugador: string,
    estado: ResultadoEstadisticasJugador['estado'],
    detalle?: string,
    metricas?: WhoScoredMetricas,
  ): ResultadoEstadisticasJugador {
    return { estado, idJugador, ...(detalle ? { detalle } : {}), ...(metricas ? { metricas } : {}) };
  }
}
