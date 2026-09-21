import { randomUUID } from 'node:crypto';
import type { Equipo } from './equipo';
import type { IdentidadExternaJugador } from './identidad-externa-jugador';
import type { Liga } from './liga';
import { normalizarClave, normalizarTexto } from './normalizar-texto';

export interface CrearJugadorInput {
  id?: string;
  nombre: string;
  posicion: string;
  equipo: Equipo;
  liga: Liga;
  activo?: boolean;
  actualizadoEn?: Date;
  identidadesExternas?: IdentidadExternaJugador[];
}

export class Jugador {
  readonly id: string;
  readonly nombre: string;
  readonly posicion: string;
  readonly equipo: Equipo;
  readonly liga: Liga;
  readonly activo: boolean;
  readonly actualizadoEn: Date;
  private readonly identidades: IdentidadExternaJugador[];

  private constructor(input: {
    id: string;
    nombre: string;
    posicion: string;
    equipo: Equipo;
    liga: Liga;
    activo: boolean;
    actualizadoEn: Date;
    identidadesExternas: IdentidadExternaJugador[];
  }) {
    if (input.equipo.ligaId !== input.liga.id) {
      throw new Error('El equipo no pertenece a la liga del jugador.');
    }
    this.id = input.id;
    this.nombre = input.nombre;
    this.posicion = input.posicion;
    this.equipo = input.equipo;
    this.liga = input.liga;
    this.activo = input.activo;
    this.actualizadoEn = input.actualizadoEn;
    this.identidades = [...input.identidadesExternas];
  }

  static crear(input: CrearJugadorInput): Jugador {
    return new Jugador({
      id: input.id ?? randomUUID(),
      nombre: normalizarTexto(input.nombre, 'nombre de jugador'),
      posicion: normalizarClave(input.posicion, 'posicion'),
      equipo: input.equipo,
      liga: input.liga,
      activo: input.activo ?? true,
      actualizadoEn: input.actualizadoEn ?? new Date(),
      identidadesExternas: input.identidadesExternas ?? [],
    });
  }

  get identidadesExternas(): readonly IdentidadExternaJugador[] {
    return this.identidades;
  }

  asociarIdentidadExterna(identidad: IdentidadExternaJugador): void {
    if (identidad.jugadorId !== this.id) {
      throw new Error('La identidad externa no corresponde al jugador.');
    }
    const duplicada = this.identidades.some(
      (actual) =>
        actual.proveedor === identidad.proveedor && actual.externalId === identidad.externalId,
    );
    if (!duplicada) this.identidades.push(identidad);
  }
}
