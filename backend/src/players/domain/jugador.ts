import { randomUUID } from 'node:crypto';

export interface CrearJugadorInput {
  id?: string;
  proveedorId: number;
  equipoId: string;
  nombre: string;
  nombreCompleto?: string | null;
  posicion?: string | null;
  fechaNacimiento?: string | null;
  nacionalidad?: string | null;
}

export class Jugador {
  readonly id: string;
  readonly proveedorId: number;
  readonly equipoId: string;
  readonly nombre: string;
  readonly nombreCompleto: string | null;
  readonly posicion: string | null;
  readonly fechaNacimiento: string | null;
  readonly nacionalidad: string | null;

  private constructor(input: Required<CrearJugadorInput>) {
    this.id = input.id;
    this.proveedorId = input.proveedorId;
    this.equipoId = input.equipoId;
    this.nombre = input.nombre;
    this.nombreCompleto = input.nombreCompleto;
    this.posicion = input.posicion;
    this.fechaNacimiento = input.fechaNacimiento;
    this.nacionalidad = input.nacionalidad;
  }

  static crear(input: CrearJugadorInput): Jugador {
    const nombre = input.nombre.trim();
    const fechaNacimiento = normalizarFecha(input.fechaNacimiento);
    if (!Number.isInteger(input.proveedorId) || input.proveedorId <= 0) {
      throw new Error('El identificador externo del jugador debe ser positivo.');
    }
    if (!input.equipoId.trim()) throw new Error('El equipo del jugador es obligatorio.');
    if (!nombre) throw new Error('El nombre del jugador es obligatorio.');
    if (input.fechaNacimiento && !fechaNacimiento) {
      throw new Error('La fecha de nacimiento del jugador no es válida.');
    }
    return new Jugador({
      id: input.id ?? randomUUID(),
      proveedorId: input.proveedorId,
      equipoId: input.equipoId,
      nombre,
      nombreCompleto: normalizarOpcional(input.nombreCompleto),
      posicion: normalizarOpcional(input.posicion),
      fechaNacimiento,
      nacionalidad: normalizarOpcional(input.nacionalidad),
    });
  }
}

function normalizarOpcional(value: string | null | undefined): string | null {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || null;
}

function normalizarFecha(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = value.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date ? null : date;
}
