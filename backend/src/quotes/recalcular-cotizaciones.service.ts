import { Inject, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  EstrategiaCotizacion,
  type PesosEstrategiaCotizacion,
  type TipoEstrategiaCotizacion,
} from './domain/estrategia-cotizacion';
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

export type PesosPorEstrategia = Record<
  TipoEstrategiaCotizacion,
  PesosEstrategiaCotizacion
>;

export interface ConfiguracionEstrategiaCotizacion {
  tipoEstrategia: TipoEstrategiaCotizacion;
  numeroVersion: number;
  pesos: PesosEstrategiaCotizacion;
  persistida: boolean;
}

@Injectable()
export class RecalcularCotizacionesService {
  private readonly reloj: () => Date = () => new Date();
  private readonly crearId: () => string = randomUUID;

  constructor(
    @Inject(QUOTE_RECALCULATION_REPOSITORY)
    private readonly recalculos: QuoteRecalculationRepository,
  ) {}

  async listarConfiguraciones(): Promise<ConfiguracionEstrategiaCotizacion[]> {
    const versiones = await this.recalculos.listarUltimasVersionesEstrategia();
    const porTipo = new Map(versiones.map((version) => [version.tipoEstrategia, version]));
    return (['ataque_decisivo', 'creacion_tecnica'] as const).map((tipo) => {
      const version = porTipo.get(tipo) ?? EstrategiaCotizacion.versionInicial(tipo);
      return {
        tipoEstrategia: tipo,
        numeroVersion: version.numeroVersion,
        pesos: { ...version.pesos },
        persistida: porTipo.has(tipo),
      };
    });
  }

  ejecutar(
    estrategiaActiva: TipoEstrategiaCotizacion,
    pesosConfigurados?: PesosPorEstrategia,
  ): Promise<ResultadoRecalculoCotizaciones> {
    if (pesosConfigurados) validarPesosConfigurados(pesosConfigurados);
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
        const versionPrevia = await unitOfWork.obtenerUltimaVersionEstrategia(tipo);
        const pesosSolicitados = pesosConfigurados?.[tipo];
        const pesosVigentes = pesosSolicitados ?? versionPrevia?.pesos
          ?? EstrategiaCotizacion.versionInicial(tipo).pesos;
        const cambioPesos = !versionPrevia || !mismosPesos(versionPrevia.pesos, pesosVigentes);
        const version = cambioPesos
          ? await unitOfWork.crearVersionEstrategia({
            tipo,
            version: (versionPrevia?.numeroVersion ?? 0) + 1,
            pesos: { ...pesosVigentes },
          })
          : versionPrevia!;
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

function mismosPesos(
  primero: PesosEstrategiaCotizacion,
  segundo: PesosEstrategiaCotizacion,
): boolean {
  return Object.keys(primero).every((metrica) =>
    primero[metrica as keyof PesosEstrategiaCotizacion]
      === segundo[metrica as keyof PesosEstrategiaCotizacion]);
}

function validarPesosConfigurados(pesosPorEstrategia: PesosPorEstrategia): void {
  for (const tipo of ['ataque_decisivo', 'creacion_tecnica'] as const) {
    const pesos = pesosPorEstrategia[tipo];
    const valores = Object.values(pesos);
    if (
      valores.length !== 7
      || valores.some((valor) => !Number.isInteger(valor) || valor < 0 || valor > 100)
      || valores.reduce((total, valor) => total + valor, 0) !== 100
    ) {
      throw new UnprocessableEntityException(
        `Los pesos de ${tipo} deben ser enteros entre 0 y 100 y sumar 100%.`,
      );
    }
  }
}
