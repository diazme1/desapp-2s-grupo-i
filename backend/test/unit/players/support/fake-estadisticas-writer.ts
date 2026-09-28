import type { EstadisticasJugadorWriterPort } from '../../../../src/players/estadisticas-jugador.service';
import type { EstadisticasJugador } from '../../../../src/players/domain/estadisticas-jugador';
import type { WhoScoredOperationContext } from '../../../../src/players/adapters/whoscored/whoscored.types';

export class FakeEstadisticasWriter implements EstadisticasJugadorWriterPort {
  readonly guardadas: EstadisticasJugador[] = [];
  errorDeEscritura: Error | null = null;

  async guardar(
    estadisticas: EstadisticasJugador,
    _context?: WhoScoredOperationContext,
  ): Promise<string> {
    if (this.errorDeEscritura) throw this.errorDeEscritura;
    this.guardadas.push(estadisticas);
    return estadisticas.idEstadistica;
  }
}
