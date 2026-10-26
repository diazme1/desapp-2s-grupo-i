import { EstrategiaCotizacion } from '../../../src/players/domain/estrategia-cotizacion';
import { RecalcularCotizacionesService } from '../../../src/quotes/recalcular-cotizaciones.service';
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

  function preparar() {
    const unitOfWork = {
      contarJugadores: jest.fn().mockResolvedValue(2),
      listarUltimasEstadisticas: jest.fn().mockResolvedValue([estadistica]),
      obtenerOCrearVersionEstrategia: jest
        .fn()
        .mockImplementation(async ({ tipo }) => versiones[tipo]),
      guardarCorrida: jest.fn().mockResolvedValue(undefined),
      guardarCotizaciones: jest.fn().mockResolvedValue(undefined),
      activarCorrida: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<QuoteRecalculationUnitOfWork>;
    const repository = {
      ejecutarEnTransaccion: jest.fn(async (operacion) => operacion(unitOfWork)),
    } as unknown as jest.Mocked<QuoteRecalculationRepository>;
    return { unitOfWork, repository };
  }

  it('calcula ambas estrategias y activa la elegida al terminar la persistencia', async () => {
    const { unitOfWork, repository } = preparar();
    const service = new RecalcularCotizacionesService(repository);

    const result = await service.ejecutar('ataque_decisivo');

    expect(repository.ejecutarEnTransaccion).toHaveBeenCalledTimes(1);
    expect(unitOfWork.obtenerOCrearVersionEstrategia).toHaveBeenCalledTimes(2);
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

  it('no intenta activar la corrida si falla la escritura del historial', async () => {
    const { unitOfWork, repository } = preparar();
    unitOfWork.guardarCotizaciones.mockRejectedValue(new Error('fallo de DB'));
    const service = new RecalcularCotizacionesService(repository);

    await expect(service.ejecutar('ataque_decisivo')).rejects.toThrow('fallo de DB');
    expect(unitOfWork.activarCorrida).not.toHaveBeenCalled();
  });
});
