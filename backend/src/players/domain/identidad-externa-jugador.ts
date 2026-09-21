import { randomUUID } from 'node:crypto';
import { normalizarClave } from './normalizar-texto';

export interface CrearIdentidadExternaInput {
  id?: string;
  jugadorId: string;
  proveedor: string;
  externalId: string;
}

export class IdentidadExternaJugador {
  readonly id: string;
  readonly jugadorId: string;
  readonly proveedor: string;
  readonly externalId: string;

  private constructor(input: Required<CrearIdentidadExternaInput>) {
    this.id = input.id;
    this.jugadorId = input.jugadorId;
    this.proveedor = input.proveedor;
    this.externalId = input.externalId;
  }

  static crear(input: CrearIdentidadExternaInput): IdentidadExternaJugador {
    return new IdentidadExternaJugador({
      id: input.id ?? randomUUID(),
      jugadorId: normalizarClave(input.jugadorId, 'jugadorId'),
      proveedor: normalizarClave(input.proveedor, 'proveedor'),
      externalId: normalizarClave(input.externalId, 'externalId'),
    });
  }
}
