import { randomUUID } from 'node:crypto';

export interface CrearEquipoInput {
  id?: string;
  proveedorId: number;
  ligaId: string;
  nombre: string;
  nombreCorto?: string | null;
  sigla?: string | null;
  escudoUrl?: string | null;
}

export class Equipo {
  readonly id: string;
  readonly proveedorId: number;
  readonly ligaId: string;
  readonly nombre: string;
  readonly nombreCorto: string | null;
  readonly sigla: string | null;
  readonly escudoUrl: string | null;

  private constructor(input: Required<CrearEquipoInput>) {
    this.id = input.id;
    this.proveedorId = input.proveedorId;
    this.ligaId = input.ligaId;
    this.nombre = input.nombre;
    this.nombreCorto = input.nombreCorto;
    this.sigla = input.sigla;
    this.escudoUrl = input.escudoUrl;
  }

  static crear(input: CrearEquipoInput): Equipo {
    const nombre = input.nombre.trim();
    if (!Number.isInteger(input.proveedorId) || input.proveedorId <= 0) {
      throw new Error('El identificador externo del equipo debe ser positivo.');
    }
    if (!input.ligaId.trim()) throw new Error('La liga del equipo es obligatoria.');
    if (!nombre) throw new Error('El nombre del equipo es obligatorio.');
    return new Equipo({
      id: input.id ?? randomUUID(),
      proveedorId: input.proveedorId,
      ligaId: input.ligaId,
      nombre,
      nombreCorto: normalizarOpcional(input.nombreCorto),
      sigla: normalizarOpcional(input.sigla)?.toUpperCase() ?? null,
      escudoUrl: normalizarOpcional(input.escudoUrl),
    });
  }
}

function normalizarOpcional(value: string | null | undefined): string | null {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || null;
}
