import { randomUUID } from 'node:crypto';

export interface CrearLigaInput {
  id?: string;
  proveedorId: number;
  codigo: string;
  nombre: string;
  pais?: string | null;
  emblemaUrl?: string | null;
}

export class Liga {
  readonly id: string;
  readonly proveedorId: number;
  readonly codigo: string;
  readonly nombre: string;
  readonly pais: string | null;
  readonly emblemaUrl: string | null;

  private constructor(input: Required<CrearLigaInput>) {
    this.id = input.id;
    this.proveedorId = input.proveedorId;
    this.codigo = input.codigo;
    this.nombre = input.nombre;
    this.pais = input.pais;
    this.emblemaUrl = input.emblemaUrl;
  }

  static crear(input: CrearLigaInput): Liga {
    const codigo = input.codigo.trim().toUpperCase();
    const nombre = input.nombre.trim();
    if (!Number.isInteger(input.proveedorId) || input.proveedorId <= 0) {
      throw new Error('El identificador externo de la liga debe ser positivo.');
    }
    if (!codigo) throw new Error('El código de la liga es obligatorio.');
    if (!nombre) throw new Error('El nombre de la liga es obligatorio.');
    return new Liga({
      id: input.id ?? randomUUID(),
      proveedorId: input.proveedorId,
      codigo,
      nombre,
      pais: normalizarOpcional(input.pais),
      emblemaUrl: normalizarOpcional(input.emblemaUrl),
    });
  }
}

function normalizarOpcional(value: string | null | undefined): string | null {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || null;
}
