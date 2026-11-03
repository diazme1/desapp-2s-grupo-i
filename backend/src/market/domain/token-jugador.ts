import { randomUUID } from 'node:crypto';

export interface CreateTokenJugadorInput {
  idToken?: string;
  jugadorId: string;
  usuarioOwnerId: string;
  numeroEmision: number;
  loteEmisionId: string;
  emitidoEn?: Date;
  actualizadoEn?: Date;
}

export class TokenJugador {
  readonly idToken: string;
  readonly jugadorId: string;
  readonly usuarioOwnerId: string;
  readonly numeroEmision: number;
  readonly loteEmisionId: string;
  readonly emitidoEn: Date;
  readonly actualizadoEn: Date;

  private constructor(input: Required<CreateTokenJugadorInput>) {
    if (!input.jugadorId) throw new Error('El token debe pertenecer a un jugador.');
    if (!input.usuarioOwnerId) throw new Error('El token debe tener un propietario.');
    if (!Number.isInteger(input.numeroEmision) || input.numeroEmision < 1 || input.numeroEmision > 100)
      throw new Error('El número de emisión debe estar entre 1 y 100.');
    if (!input.loteEmisionId) throw new Error('El token debe pertenecer a un lote.');
    this.idToken = input.idToken;
    this.jugadorId = input.jugadorId;
    this.usuarioOwnerId = input.usuarioOwnerId;
    this.numeroEmision = input.numeroEmision;
    this.loteEmisionId = input.loteEmisionId;
    this.emitidoEn = input.emitidoEn;
    this.actualizadoEn = input.actualizadoEn;
  }

  static emitir(input: CreateTokenJugadorInput): TokenJugador {
    const now = input.emitidoEn ?? new Date();
    return new TokenJugador({
      ...input,
      idToken: input.idToken ?? randomUUID(),
      emitidoEn: now,
      actualizadoEn: input.actualizadoEn ?? now,
    });
  }

  transferirA(usuarioOwnerId: string): TokenJugador {
    if (!usuarioOwnerId) throw new Error('El token debe tener un propietario.');
    return new TokenJugador({
      idToken: this.idToken,
      jugadorId: this.jugadorId,
      usuarioOwnerId,
      numeroEmision: this.numeroEmision,
      loteEmisionId: this.loteEmisionId,
      emitidoEn: this.emitidoEn,
      actualizadoEn: new Date(),
    });
  }

  transferirDesde(propietarioActual: string, usuarioOwnerId: string): TokenJugador {
    if (this.usuarioOwnerId !== propietarioActual)
      throw new Error('El token no pertenece al propietario esperado.');
    return this.transferirA(usuarioOwnerId);
  }
}
