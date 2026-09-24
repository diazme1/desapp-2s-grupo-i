import { randomUUID } from 'node:crypto';

export interface EstadisticasJugadorInput {
  idEstadistica?: string;
  idJugador: string;
  goles: number | null;
  asistencias: number | null;
  tiros: number | null;
  pasesClave: number | null;
  regates: number | null;
  entradas: number | null;
  ratingWhoScored: number | null;
}

export class EstadisticasJugador {
  readonly idEstadistica: string;
  readonly idJugador: string;
  readonly goles: number | null;
  readonly asistencias: number | null;
  readonly tiros: number | null;
  readonly pasesClave: number | null;
  readonly regates: number | null;
  readonly entradas: number | null;
  readonly ratingWhoScored: number | null;

  private constructor(input: Required<EstadisticasJugadorInput>) {
    this.idEstadistica = input.idEstadistica;
    this.idJugador = input.idJugador;
    this.goles = input.goles;
    this.asistencias = input.asistencias;
    this.tiros = input.tiros;
    this.pasesClave = input.pasesClave;
    this.regates = input.regates;
    this.entradas = input.entradas;
    this.ratingWhoScored = input.ratingWhoScored;
  }

  static crear(input: EstadisticasJugadorInput): EstadisticasJugador {
    const idJugador = input.idJugador.trim();
    if (!idJugador) throw new Error('El idJugador es obligatorio.');

    const contadores = [
      input.goles,
      input.asistencias,
      input.tiros,
      input.pasesClave,
      input.regates,
      input.entradas,
    ];
    if (contadores.every((valor) => valor === null) && input.ratingWhoScored === null) {
      throw new Error('Debe existir al menos una estadistica recuperable.');
    }
    for (const contador of contadores) {
      if (contador !== null && (!Number.isInteger(contador) || contador < 0)) {
        throw new Error('Las estadisticas de conteo deben ser enteros no negativos.');
      }
    }
    if (
      input.ratingWhoScored !== null &&
      (!Number.isFinite(input.ratingWhoScored) || input.ratingWhoScored < 0)
    ) {
      throw new Error('El rating de WhoScored debe ser un numero finito no negativo.');
    }

    return new EstadisticasJugador({
      idEstadistica: input.idEstadistica ?? randomUUID(),
      idJugador,
      goles: input.goles,
      asistencias: input.asistencias,
      tiros: input.tiros,
      pasesClave: input.pasesClave,
      regates: input.regates,
      entradas: input.entradas,
      ratingWhoScored: input.ratingWhoScored,
    });
  }
}
