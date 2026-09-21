import type { IdentidadExternaJugador } from './domain/identidad-externa-jugador';
import type { Jugador } from './domain/jugador';

export const JUGADOR_REPOSITORY = Symbol('JUGADOR_REPOSITORY');

export interface FiltrosJugadores {
  liga?: string;
  equipo?: string;
  posicion?: string;
  activo?: boolean;
}

export interface ResultadoJugadores {
  items: Jugador[];
  total: number;
}

export interface JugadorRepository {
  listar(filtros: FiltrosJugadores): Promise<ResultadoJugadores>;
  buscarActivoPorId(id: string): Promise<Jugador | null>;
  buscarPorIdentidadExterna(proveedor: string, externalId: string): Promise<Jugador | null>;
  guardar(jugador: Jugador): Promise<Jugador>;
  guardarIdentidadExterna(identidad: IdentidadExternaJugador): Promise<void>;
}
