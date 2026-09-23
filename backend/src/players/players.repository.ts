import { Equipo } from './domain/equipo';
import { Jugador } from './domain/jugador';
import { Liga } from './domain/liga';

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

export interface PlayersRepository {
  guardarCatalogo(catalogo: CatalogoBase): Promise<ResumenActualizacionCatalogo>;
  listar(ligaCodigo?: string): Promise<JugadorConRelaciones[]>;
  buscarPorId(id: string): Promise<JugadorConRelaciones | null>;
}
