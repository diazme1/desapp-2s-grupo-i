import type {
  EstadisticasJugadorWriterPort,
  JugadorLookupPort,
} from '../../../../src/players/estadisticas-jugador.service';
import type { EstadisticasJugador } from '../../../../src/players/domain/estadisticas-jugador';
import type { WhoScoredOperationContext } from '../../../../src/players/adapters/whoscored/whoscored.types';
import type {
  CatalogoBase,
  JugadorConRelaciones,
  JugadorProcesado,
  PlayersRepository,
  ResultadoGuardadoCatalogo,
} from '../../../../src/players/players.repository';

export class FakePlayersRepository
  implements JugadorLookupPort, EstadisticasJugadorWriterPort, Partial<PlayersRepository>
{
  readonly guardadas: EstadisticasJugador[] = [];
  jugadoresProcesados: JugadorProcesado[] = [];
  jugadorExiste = true;
  errorDeEscritura: Error | null = null;

  async guardarCatalogo(catalogo: CatalogoBase): Promise<ResultadoGuardadoCatalogo> {
    return {
      ligas: catalogo.ligas.length,
      equipos: catalogo.equipos.length,
      jugadores: catalogo.jugadores.length,
      jugadoresProcesados: this.jugadoresProcesados,
    };
  }

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

  async guardarEstadisticas(
    estadisticas: EstadisticasJugador,
    context?: WhoScoredOperationContext,
  ): Promise<string> {
    return this.guardar(estadisticas, context);
  }

  async listar(): Promise<JugadorConRelaciones[]> {
    return [];
  }

  async buscarPorId(): Promise<JugadorConRelaciones | null> {
    return null;
  }
}
