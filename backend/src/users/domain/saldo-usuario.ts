import { randomUUID } from 'node:crypto';
import { Creditos } from '../../market/domain/creditos';

export interface CreateSaldoUsuarioInput {
  id?: string;
  usuarioId: string;
  creditosDisponibles: Creditos;
  creadoEn?: Date;
  actualizadoEn?: Date;
}

export class SaldoUsuario {
  readonly id: string;
  readonly usuarioId: string;
  readonly creditosDisponibles: Creditos;
  readonly creadoEn: Date;
  readonly actualizadoEn: Date;

  private constructor(input: Required<CreateSaldoUsuarioInput>) {
    if (!input.usuarioId) throw new Error('El saldo debe pertenecer a un usuario.');
    this.id = input.id;
    this.usuarioId = input.usuarioId;
    this.creditosDisponibles = input.creditosDisponibles;
    this.creadoEn = input.creadoEn;
    this.actualizadoEn = input.actualizadoEn;
  }

  static crear(input: CreateSaldoUsuarioInput): SaldoUsuario {
    return new SaldoUsuario({
      id: input.id ?? randomUUID(),
      usuarioId: input.usuarioId,
      creditosDisponibles: input.creditosDisponibles,
      creadoEn: input.creadoEn ?? new Date(),
      actualizadoEn: input.actualizadoEn ?? input.creadoEn ?? new Date(),
    });
  }

  acreditar(importe: Creditos): SaldoUsuario {
    return SaldoUsuario.crear({
      id: this.id,
      usuarioId: this.usuarioId,
      creditosDisponibles: this.creditosDisponibles.sumar(importe),
      creadoEn: this.creadoEn,
      actualizadoEn: new Date(),
    });
  }

  debitar(importe: Creditos): SaldoUsuario {
    return SaldoUsuario.crear({
      id: this.id,
      usuarioId: this.usuarioId,
      creditosDisponibles: this.creditosDisponibles.restar(importe),
      creadoEn: this.creadoEn,
      actualizadoEn: new Date(),
    });
  }

  tieneCreditosSuficientes(importe: Creditos): boolean {
    return this.creditosDisponibles.compareTo(importe) >= 0;
  }
}
