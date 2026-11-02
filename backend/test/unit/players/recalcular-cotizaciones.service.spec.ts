import { UnprocessableEntityException } from '@nestjs/common';
import {
  EstrategiaCotizacion,
  type PesosEstrategiaCotizacion,
  type TipoEstrategiaCotizacion,
} from '../../../src/players/domain/estrategia-cotizacion';
import { RecalcularCotizacionesService } from '../../../src/quotes/recalcular-cotizaciones.service';
import type {
  ConfiguracionEstrategiaCotizacion,
  PesosPorEstrategia,
} from '../../../src/quotes/recalcular-cotizaciones.service';
import type {
  QuoteRecalculationRepository,
  QuoteRecalculationUnitOfWork,
} from '../../../src/quotes/quote-recalculation.repository';

describe('RecalcularCotizacionesService', () => {
  const versiones = {
    ataque_decisivo: {
      id: 'version-1',
      tipoEstrategia: 'ataque_decisivo' as const,
      numeroVersion: 1,
      pesos: EstrategiaCotizacion.versionInicial('ataque_decisivo').pesos,
    },
    creacion_tecnica: {
      id: 'version-2',
      tipoEstrategia: 'creacion_tecnica' as const,
      numeroVersion: 1,
      pesos: EstrategiaCotizacion.versionInicial('creacion_tecnica').pesos,
    },
  };
  const estadistica = {
    idEstadistica: 'stats-1',
    idJugador: 'player-1',
    goles: 10,
    asistencias: null,
    tiros: 2,
    pasesClave: null,
    regates: null,
    faltasCometidas: 1,
    ratingWhoScored: 7.5,
  };

  function preparar(
    versionesActuales: Partial<typeof versiones> = versiones,
    cantidadJugadores = 2,
    estadisticas: (typeof estadistica)[] = [estadistica],
  ) {
    const unitOfWork = {
      contarJugadores: jest.fn().mockResolvedValue(cantidadJugadores),
      listarUltimasEstadisticas: jest.fn().mockResolvedValue(estadisticas),
      obtenerUltimaVersionEstrategia: jest.fn(
        async (tipo: TipoEstrategiaCotizacion) =>
          versionesActuales[tipo] ?? null,
      ),
      crearVersionEstrategia: jest.fn(
        async (input: {
          tipo: TipoEstrategiaCotizacion;
          version: number;
          pesos: PesosEstrategiaCotizacion;
        }) => ({
          id: `new-${input.tipo}`,
          tipoEstrategia: input.tipo,
          numeroVersion: input.version,
          pesos: input.pesos,
        }),
      ),
      guardarCorrida: jest.fn().mockResolvedValue(undefined),
      guardarCotizaciones: jest.fn().mockResolvedValue(undefined),
      activarCorrida: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<QuoteRecalculationUnitOfWork>;
    const repository = {
      listarUltimasVersionesEstrategia: jest.fn().mockResolvedValue([]),
      ejecutarEnTransaccion: jest.fn(async (operacion) =>
        operacion(unitOfWork),
      ),
    } as unknown as jest.Mocked<QuoteRecalculationRepository>;
    return { unitOfWork, repository };
  }

  function pesosPorDefecto(): PesosPorEstrategia {
    return {
      ataque_decisivo: {
        ...EstrategiaCotizacion.versionInicial('ataque_decisivo').pesos,
      },
      creacion_tecnica: {
        ...EstrategiaCotizacion.versionInicial('creacion_tecnica').pesos,
      },
    };
  }

  it('lista versiones persistidas y completa las estrategias aún no guardadas', async () => {
    const { repository } = preparar();
    repository.listarUltimasVersionesEstrategia.mockResolvedValue([
      versiones.ataque_decisivo,
    ]);
    const service = new RecalcularCotizacionesService(repository);

    const result = await service.listarConfiguraciones();

    expect(result).toEqual([
      {
        tipoEstrategia: 'ataque_decisivo',
        numeroVersion: 1,
        pesos: versiones.ataque_decisivo.pesos,
        persistida: true,
      },
      {
        tipoEstrategia: 'creacion_tecnica',
        numeroVersion: 1,
        pesos: EstrategiaCotizacion.versionInicial('creacion_tecnica').pesos,
        persistida: false,
      },
    ] satisfies ConfiguracionEstrategiaCotizacion[]);
    expect(result[0].pesos).not.toBe(versiones.ataque_decisivo.pesos);
  });

  it('calcula ambas estrategias y activa la elegida al terminar la persistencia', async () => {
    const { unitOfWork, repository } = preparar();
    const service = new RecalcularCotizacionesService(repository);

    const result = await service.ejecutar('ataque_decisivo');

    expect(repository.ejecutarEnTransaccion).toHaveBeenCalledTimes(1);
    expect(unitOfWork.obtenerUltimaVersionEstrategia).toHaveBeenCalledTimes(2);
    expect(unitOfWork.crearVersionEstrategia).not.toHaveBeenCalled();
    expect(unitOfWork.guardarCorrida).toHaveBeenCalledTimes(2);
    expect(unitOfWork.guardarCotizaciones).toHaveBeenCalledTimes(2);
    expect(unitOfWork.guardarCotizaciones).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        tipoEstrategia: 'ataque_decisivo',
        cotizaciones: [
          expect.objectContaining({
            idJugador: 'player-1',
            idEstadistica: 'stats-1',
            cotizacion: '5.23',
          }),
        ],
      }),
    );
    expect(unitOfWork.guardarCotizaciones).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        tipoEstrategia: 'creacion_tecnica',
        cotizaciones: [expect.objectContaining({ cotizacion: '2.68' })],
      }),
    );
    const idCorridaAtaque = unitOfWork.guardarCorrida.mock.calls[0][0].id;
    expect(unitOfWork.activarCorrida).toHaveBeenCalledWith(
      idCorridaAtaque,
      'ataque_decisivo',
      expect.any(Date),
    );
    expect(result.estrategiasCalculadas).toEqual([
      'ataque_decisivo',
      'creacion_tecnica',
    ]);
    expect(result.jugadoresCotizados).toBe(1);
    expect(result.jugadoresSinEstadisticas).toBe(1);
  });

  it('crea versiones nuevas solo para las estrategias cuyos pesos cambiaron', async () => {
    const { unitOfWork, repository } = preparar();
    const pesos = pesosPorDefecto();
    pesos.ataque_decisivo.goles = 40;
    pesos.ataque_decisivo.tiros = 15;
    const service = new RecalcularCotizacionesService(repository);

    const result = await service.ejecutar('ataque_decisivo', pesos);

    expect(unitOfWork.crearVersionEstrategia).toHaveBeenCalledTimes(1);
    expect(unitOfWork.crearVersionEstrategia).toHaveBeenCalledWith({
      tipo: 'ataque_decisivo',
      version: 2,
      pesos: pesos.ataque_decisivo,
    });
    expect(unitOfWork.guardarCorrida).toHaveBeenCalledWith(
      expect.objectContaining({ idVersionEstrategia: 'new-ataque_decisivo' }),
    );
    expect(result.versionEstrategia).toBe(2);
  });

  it('crea las versiones iniciales si todavía no hay una versión persistida', async () => {
    const { unitOfWork, repository } = preparar({});
    const service = new RecalcularCotizacionesService(repository);

    await service.ejecutar('creacion_tecnica');

    expect(unitOfWork.crearVersionEstrategia).toHaveBeenCalledTimes(2);
    expect(unitOfWork.crearVersionEstrategia).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ tipo: 'ataque_decisivo', version: 1 }),
    );
    expect(unitOfWork.crearVersionEstrategia).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ tipo: 'creacion_tecnica', version: 1 }),
    );
  });

  it.each([
    [
      'suma distinta de 100',
      (pesos: PesosPorEstrategia) => {
        pesos.ataque_decisivo.goles -= 1;
      },
    ],
    [
      'peso negativo',
      (pesos: PesosPorEstrategia) => {
        pesos.ataque_decisivo.goles = -1;
      },
    ],
    [
      'peso mayor a 100',
      (pesos: PesosPorEstrategia) => {
        pesos.ataque_decisivo.goles = 101;
      },
    ],
    [
      'peso decimal',
      (pesos: PesosPorEstrategia) => {
        pesos.ataque_decisivo.goles = 10.5;
      },
    ],
    [
      'métrica faltante',
      (pesos: PesosPorEstrategia) => {
        delete (pesos.ataque_decisivo as Partial<PesosEstrategiaCotizacion>)
          .rating;
      },
    ],
  ])('rechaza pesos inválidos: %s', (_caso, invalidar) => {
    const { repository } = preparar();
    const service = new RecalcularCotizacionesService(repository);
    const pesos = pesosPorDefecto();
    invalidar(pesos);

    expect(() => service.ejecutar('ataque_decisivo', pesos)).toThrow(
      UnprocessableEntityException,
    );
    expect(repository.ejecutarEnTransaccion).not.toHaveBeenCalled();
  });

  it('no intenta activar la corrida si falla la escritura del historial', async () => {
    const { unitOfWork, repository } = preparar();
    unitOfWork.guardarCotizaciones.mockRejectedValue(new Error('fallo de DB'));
    const service = new RecalcularCotizacionesService(repository);

    await expect(service.ejecutar('ataque_decisivo')).rejects.toThrow(
      'fallo de DB',
    );
    expect(unitOfWork.activarCorrida).not.toHaveBeenCalled();
  });
});
