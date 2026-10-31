import { randomUUID } from 'node:crypto';
import { Creditos } from '../../market/domain/creditos';
import { UserRole } from './user';
import { SaldoExacto } from './saldo-exacto';

export interface CreateSaldoUsuarioInput {
  id?: string;
  usuarioId: string;
  creditosDisponibles: Creditos | SaldoExacto;
  rol?: UserRole;
  creadoEn?: Date;
  actualizadoEn?: Date;
}

export class SaldoUsuario {
  readonly id: string;
  readonly usuarioId: string;
  readonly creditosDisponibles: SaldoExacto;
  readonly rol: UserRole;
  readonly creadoEn: Date;
  readonly actualizadoEn: Date;

  private constructor(input: Required<CreateSaldoUsuarioInput>) {
    if (!input.usuarioId)
      throw new Error('El saldo debe pertenecer a un usuario.');
    if (
      input.rol !== UserRole.SUPERADMIN &&
      input.creditosDisponibles.toUnidades() < 0n
    )
      throw new Error('El saldo de un usuario común no puede quedar negativo.');
    this.id = input.id;
    this.usuarioId = input.usuarioId;
    this.creditosDisponibles =
      input.creditosDisponibles instanceof SaldoExacto
        ? input.creditosDisponibles
        : SaldoExacto.fromCreditos(input.creditosDisponibles);
    this.rol = input.rol;
    this.creadoEn = input.creadoEn;
    this.actualizadoEn = input.actualizadoEn;
  }

  static crear(input: CreateSaldoUsuarioInput): SaldoUsuario {
    return new SaldoUsuario({
      id: input.id ?? randomUUID(),
      usuarioId: input.usuarioId,
      creditosDisponibles: input.creditosDisponibles,
      rol: input.rol ?? UserRole.USER,
      creadoEn: input.creadoEn ?? new Date(),
      actualizadoEn: input.actualizadoEn ?? input.creadoEn ?? new Date(),
    });
  }

  acreditar(importe: Creditos): SaldoUsuario {
    return SaldoUsuario.crear({
      id: this.id,
      usuarioId: this.usuarioId,
      creditosDisponibles: this.creditosDisponibles.sumar(importe),
      rol: this.rol,
      creadoEn: this.creadoEn,
      actualizadoEn: new Date(),
    });
  }

  debitar(importe: Creditos): SaldoUsuario {
    const actualizado = this.creditosDisponibles.restar(importe);
    if (this.rol !== UserRole.SUPERADMIN && actualizado.toUnidades() < 0n)
      throw new Error('El saldo de un usuario común no puede quedar negativo.');
    return SaldoUsuario.crear({
      id: this.id,
      usuarioId: this.usuarioId,
      creditosDisponibles: actualizado,
      rol: this.rol,
      creadoEn: this.creadoEn,
      actualizadoEn: new Date(),
    });
  }

  tieneCreditosSuficientes(importe: Creditos): boolean {
    return this.creditosDisponibles.compareTo(importe) >= 0;
  }
}
