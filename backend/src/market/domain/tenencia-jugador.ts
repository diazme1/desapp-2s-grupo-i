import { randomUUID } from 'node:crypto';

export interface CreateTenenciaJugadorInput {
  id?: string;
  usuarioId: string;
  jugadorId: string;
  cantidadTokens: number;
  creadoEn?: Date;
  actualizadoEn?: Date;
}

export class TenenciaJugador {
  readonly id: string;
  readonly usuarioId: string;
  readonly jugadorId: string;
  readonly cantidadTokens: number;
  readonly creadoEn: Date;
  readonly actualizadoEn: Date;

  private constructor(input: Required<CreateTenenciaJugadorInput>) {
    if (!input.usuarioId || !input.jugadorId)
      throw new Error('La tenencia debe identificar usuario y jugador.');
    if (!Number.isInteger(input.cantidadTokens) || input.cantidadTokens < 0 || input.cantidadTokens > 100)
      throw new Error('La cantidad de tokens debe estar entre 0 y 100.');
    this.id = input.id;
    this.usuarioId = input.usuarioId;
    this.jugadorId = input.jugadorId;
    this.cantidadTokens = input.cantidadTokens;
    this.creadoEn = input.creadoEn;
    this.actualizadoEn = input.actualizadoEn;
  }

  static crear(input: CreateTenenciaJugadorInput): TenenciaJugador {
    return new TenenciaJugador({
      id: input.id ?? randomUUID(),
      usuarioId: input.usuarioId,
      jugadorId: input.jugadorId,
      cantidadTokens: input.cantidadTokens,
      creadoEn: input.creadoEn ?? new Date(),
      actualizadoEn: input.actualizadoEn ?? input.creadoEn ?? new Date(),
    });
  }

  actualizarCantidad(cantidadTokens: number): TenenciaJugador {
    return TenenciaJugador.crear({
      id: this.id,
      usuarioId: this.usuarioId,
      jugadorId: this.jugadorId,
      cantidadTokens,
      creadoEn: this.creadoEn,
      actualizadoEn: new Date(),
    });
  }
}
