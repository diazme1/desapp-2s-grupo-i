import type {
  PesosEstrategiaCotizacion,
  TipoEstrategiaCotizacion,
  VersionEstrategiaCotizacion,
} from '../players/domain/estrategia-cotizacion';

export const QUOTE_RECALCULATION_REPOSITORY = Symbol(
  'QUOTE_RECALCULATION_REPOSITORY',
);

export interface EstadisticaParaRecalculo {
  idEstadistica: string;
  idJugador: string;
  goles: number | null;
  asistencias: number | null;
  tiros: number | null;
  pasesClave: number | null;
  regates: number | null;
  faltasCometidas: number | null;
  ratingWhoScored: number | null;
}

export interface CotizacionParaGuardar {
  idJugador: string;
  idEstadistica: string;
  cotizacion: string;
}

export interface CorridaCotizacionParaGuardar {
  id: string;
  idVersionEstrategia: string;
  fechaInicio: Date;
  fechaFin: Date;
  jugadoresCotizados: number;
}

export interface QuoteRecalculationUnitOfWork {
  contarJugadores(): Promise<number>;
  listarUltimasEstadisticas(): Promise<EstadisticaParaRecalculo[]>;
  obtenerOCrearVersionEstrategia(input: {
    tipo: TipoEstrategiaCotizacion;
    version: number;
    pesos: PesosEstrategiaCotizacion;
  }): Promise<VersionEstrategiaCotizacion>;
  guardarCorrida(corrida: CorridaCotizacionParaGuardar): Promise<void>;
  /** Guarda el historial append-only y actualiza la cotización vigente en la misma transacción. */
  guardarCotizaciones(input: {
    idRecalculo: string;
    idVersionEstrategia: string;
    tipoEstrategia: TipoEstrategiaCotizacion;
    fechaHora: Date;
    cotizaciones: CotizacionParaGuardar[];
  }): Promise<void>;
  activarCorrida(
    idRecalculo: string,
    tipoEstrategia: TipoEstrategiaCotizacion,
    fechaHora: Date,
  ): Promise<void>;
}

export interface QuoteRecalculationRepository {
  ejecutarEnTransaccion<T>(
    operacion: (unitOfWork: QuoteRecalculationUnitOfWork) => Promise<T>,
  ): Promise<T>;
}
