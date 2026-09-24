import type {
  EstadisticasJugadorWriterPort,
  JugadorLookupPort,
} from '../../../../src/players/estadisticas-jugador.service';
import type { EstadisticasJugador } from '../../../../src/players/domain/estadisticas-jugador';
import type { WhoScoredOperationContext } from '../../../../src/players/adapters/whoscored/whoscored.types';

export class FakePlayersRepository implements JugadorLookupPort, EstadisticasJugadorWriterPort {
  readonly guardadas: EstadisticasJugador[] = [];
  jugadorExiste = true;
  errorDeEscritura: Error | null = null;

  async existePorId(idJugador: string): Promise<boolean> {
    return this.jugadorExiste && idJugador.length > 0;
  }

  async guardar(
    estadisticas: EstadisticasJugador,
    _context?: WhoScoredOperationContext,
  ): Promise<string> {
    if (this.errorDeEscritura) throw this.errorDeEscritura;
    this.guardadas.push(estadisticas);
    return estadisticas.idEstadistica;
  }
}
