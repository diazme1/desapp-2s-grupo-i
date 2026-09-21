import { randomUUID } from 'node:crypto';
import type { Liga } from './liga';
import { normalizarTexto } from './normalizar-texto';

export interface CrearEquipoInput {
  id?: string;
  nombre: string;
  liga: Liga;
}

export class Equipo {
  readonly id: string;
  readonly nombre: string;
  readonly ligaId: string;

  private constructor(input: { id: string; nombre: string; ligaId: string }) {
    this.id = input.id;
    this.nombre = input.nombre;
    this.ligaId = input.ligaId;
  }

  static crear(input: CrearEquipoInput): Equipo {
    return new Equipo({
      id: input.id ?? randomUUID(),
      nombre: normalizarTexto(input.nombre, 'nombre de equipo'),
      ligaId: input.liga.id,
    });
  }
}
