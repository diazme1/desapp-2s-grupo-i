import { Equipo } from './domain/equipo';
import { EstadisticasJugador } from './domain/estadisticas-jugador';
import { Jugador } from './domain/jugador';
import { Liga } from './domain/liga';
import type { WhoScoredOperationContext } from './adapters/whoscored/whoscored.types';

export const PLAYERS_REPOSITORY = Symbol('PLAYERS_REPOSITORY');

export interface CatalogoBase {
  ligas: Liga[];
  equipos: Equipo[];
  jugadores: Jugador[];
}

export interface JugadorConRelaciones {
  jugador: Jugador;
  equipo: Equipo;
  liga: Liga;
}

export interface ResumenActualizacionCatalogo {
  ligas: number;
  equipos: number;
  jugadores: number;
}

export interface JugadorProcesado {
  idJugador: string;
  nombreJugador: string;
  equipoJugador: string;
  ligaEquipoJugador: string;
}

export interface ResultadoGuardadoCatalogo extends ResumenActualizacionCatalogo {
  jugadoresProcesados: JugadorProcesado[];
}

export interface PlayersRepository {
  guardarCatalogo(catalogo: CatalogoBase): Promise<ResultadoGuardadoCatalogo>;
  existePorId(idJugador: string): Promise<boolean | { idJugador: string } | null>;
  guardarEstadisticas(
    estadisticas: EstadisticasJugador,
    context?: WhoScoredOperationContext,
  ): Promise<string>;
  listar(ligaCodigo?: string): Promise<JugadorConRelaciones[]>;
  buscarPorId(id: string): Promise<JugadorConRelaciones | null>;
}
