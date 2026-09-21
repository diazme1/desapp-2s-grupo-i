import { randomUUID } from 'node:crypto';
import { normalizarClave, normalizarTexto } from './normalizar-texto';

export interface CrearLigaInput {
  id?: string;
  codigo: string;
  nombre: string;
}

export class Liga {
  readonly id: string;
  readonly codigo: string;
  readonly nombre: string;

  private constructor(input: Required<CrearLigaInput>) {
    this.id = input.id;
    this.codigo = input.codigo;
    this.nombre = input.nombre;
  }

  static crear(input: CrearLigaInput): Liga {
    return new Liga({
      id: input.id ?? randomUUID(),
      codigo: normalizarClave(input.codigo, 'codigo de liga'),
      nombre: normalizarTexto(input.nombre, 'nombre de liga'),
    });
  }
}
