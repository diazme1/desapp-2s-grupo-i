import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  EstrategiaCotizacion,
  type TipoEstrategiaCotizacion,
} from '../players/domain/estrategia-cotizacion';
import {
  QUOTE_RECALCULATION_REPOSITORY,
  type QuoteRecalculationRepository,
} from './quote-recalculation.repository';

export interface ResultadoRecalculoCotizaciones {
  idRecalculo: string;
  estrategia: TipoEstrategiaCotizacion;
  estrategiasCalculadas: TipoEstrategiaCotizacion[];
  versionEstrategia: number;
  fechaHora: Date;
  jugadoresCotizados: number;
  jugadoresSinEstadisticas: number;
}

@Injectable()
export class RecalcularCotizacionesService {
  private readonly reloj: () => Date = () => new Date();
  private readonly crearId: () => string = randomUUID;

  constructor(
    @Inject(QUOTE_RECALCULATION_REPOSITORY)
    private readonly recalculos: QuoteRecalculationRepository,
  ) {}

  ejecutar(
    estrategiaActiva: TipoEstrategiaCotizacion,
  ): Promise<ResultadoRecalculoCotizaciones> {
    return this.recalculos.ejecutarEnTransaccion(async (unitOfWork) => {
      const fechaInicio = this.reloj();
      const cantidadJugadores = await unitOfWork.contarJugadores();
      const estadisticas = await unitOfWork.listarUltimasEstadisticas();
      const fechaHora = this.reloj();

      const resultados = new Map<
        TipoEstrategiaCotizacion,
        { idRecalculo: string; numeroVersion: number; jugadoresCotizados: number }
      >();
      for (const tipo of [
        'ataque_decisivo',
        'creacion_tecnica',
      ] as const) {
        const configuracion = EstrategiaCotizacion.versionInicial(tipo);
        const version = await unitOfWork.obtenerOCrearVersionEstrategia({
          tipo: configuracion.tipo,
          version: configuracion.numeroVersion,
          pesos: { ...configuracion.pesos },
        });
        const estrategia = EstrategiaCotizacion.desdeVersion(version);
        const cotizaciones = estadisticas.map((estadistica) => ({
          idJugador: estadistica.idJugador,
          idEstadistica: estadistica.idEstadistica,
          cotizacion: estrategia.calcular(estadistica),
        }));
        const idRecalculo = this.crearId();

        await unitOfWork.guardarCorrida({
          id: idRecalculo,
          idVersionEstrategia: version.id,
          fechaInicio,
          fechaFin: fechaHora,
          jugadoresCotizados: cotizaciones.length,
        });
        await unitOfWork.guardarCotizaciones({
          idRecalculo,
          idVersionEstrategia: version.id,
          tipoEstrategia: tipo,
          fechaHora,
          cotizaciones,
        });
        resultados.set(tipo, {
          idRecalculo,
          numeroVersion: version.numeroVersion,
          jugadoresCotizados: cotizaciones.length,
        });
      }

      const seleccionada = resultados.get(estrategiaActiva);
      if (!seleccionada) throw new Error('La estrategia solicitada no existe.');
      await unitOfWork.activarCorrida(
        seleccionada.idRecalculo,
        estrategiaActiva,
        fechaHora,
      );

      return {
        idRecalculo: seleccionada.idRecalculo,
        estrategia: estrategiaActiva,
        estrategiasCalculadas: [...resultados.keys()],
        versionEstrategia: seleccionada.numeroVersion,
        fechaHora,
        jugadoresCotizados: seleccionada.jugadoresCotizados,
        jugadoresSinEstadisticas: Math.max(
          0,
          cantidadJugadores - seleccionada.jugadoresCotizados,
        ),
      };
    });
  }
}
