import { NotFoundException, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import {
  FastApiPredictionAdapter,
  FastApiTechnicalError,
  FastApiTrainingValidationError,
} from '../../../src/ml-players/fastapi-prediction.adapter';
import { MlPredictionService } from '../../../src/ml-players/ml-prediction.service';

const version = {
  id: 'strategy',
  tipoEstrategia: 'ataque_decisivo',
  numeroVersion: 1,
  pesos: { goles: 35, asistencias: 25, tiros: 20, pasesClave: 5, regates: 5, rating: 5, faltasCometidas: 5 },
};

function crearServicio(overrides: {
  player?: unknown;
  activeStrategy?: unknown;
  strategyVersion?: unknown;
  prediction?: unknown;
  adapterError?: Error;
} = {}) {
  const players = {
    buscarPorId: jest.fn().mockResolvedValue(
      Object.prototype.hasOwnProperty.call(overrides, 'player')
        ? overrides.player
        : {
            jugador: { posicion: 'Forward' },
            estadisticas: [{ goles: 1, asistencias: 1, tiros: 1, pasesClave: 1, regates: 1, faltasCometidas: 0, ratingWhoScored: 7 }],
          },
    ),
  };
  const dataSource = {
    query: jest.fn((sql: string) => Promise.resolve(
      sql.includes('cotizacion_vigente')
        ? [{ cotizacion: '18.25' }]
        : [{ tipoEstrategia: overrides.activeStrategy ?? 'ataque_decisivo' }],
    )),
    getRepository: jest.fn().mockReturnValue({
      findOne: jest.fn().mockResolvedValue(overrides.strategyVersion === undefined ? version : overrides.strategyVersion),
    }),
  };
  const adapter = {
    predecir: jest.fn().mockImplementation(async () => {
      if (overrides.adapterError) throw overrides.adapterError;
      return overrides.prediction ?? {
        estado: 'no_model_loaded',
      };
    }),
    entrenar: jest.fn(),
  };
  return {
    service: new MlPredictionService(players as any, dataSource as any, adapter as any),
    players,
    dataSource,
    adapter,
  };
}

describe('MlPredictionService', () => {
  it('devuelve no_disponible si FastAPI informa que aun no hay modelo', async () => {
    const players = { buscarPorId: jest.fn().mockResolvedValue({ jugador: { posicion: 'Forward' }, estadisticas: [{ goles: 1, asistencias: 0, tiros: 1, pasesClave: 1, regates: 1, faltasCometidas: 0, ratingWhoScored: 7 }] }) };
    const dataSource = { query: jest.fn().mockResolvedValue([]), getRepository: jest.fn().mockReturnValue({ findOne: jest.fn().mockResolvedValue({ id: 'strategy', tipoEstrategia: 'ataque_decisivo', numeroVersion: 1, pesos: { goles: 35, asistencias: 25, tiros: 20, pasesClave: 5, regates: 5, rating: 5, faltasCometidas: 5 } }) }) };
    const adapter = { predecir: jest.fn().mockResolvedValue({ estado: 'no_model_loaded' }) };
    const service = new MlPredictionService(players as any, dataSource as any, adapter as unknown as FastApiPredictionAdapter);
    await expect(service.obtener('player')).resolves.toMatchObject({ estado: 'no_disponible' });
  });

  it('devuelve la cotizacion actual y calcula la predicha en NestJS', async () => {
    const players = { buscarPorId: jest.fn().mockResolvedValue({ jugador: { posicion: 'Forward' }, estadisticas: [{ goles: 1, asistencias: 1, tiros: 1, pasesClave: 1, regates: 1, faltasCometidas: 0, ratingWhoScored: 7 }] }) };
    const version = { id: 'strategy', tipoEstrategia: 'ataque_decisivo', numeroVersion: 1, pesos: { goles: 35, asistencias: 25, tiros: 20, pasesClave: 5, regates: 5, rating: 5, faltasCometidas: 5 } };
    const dataSource = { query: jest.fn((sql: string) => Promise.resolve(sql.includes('cotizacion_vigente') ? [{ cotizacion: '18.25' }] : [{ tipoEstrategia: 'ataque_decisivo' }])), getRepository: jest.fn().mockReturnValue({ findOne: jest.fn().mockResolvedValue(version) }) };
    const adapter = { predecir: jest.fn().mockResolvedValue({ estado: 'ready', versionModelo: 'model-1', origenDatos: ['whoscored'], estadisticasPredichas: { goles: '2', asistencias: '1', tiros: '1.000', pasesClave: '1.000', regates: '1.000', faltasCometidas: '0.000', ratingWhoScored: '7.000' } }) };
    const service = new MlPredictionService(players as any, dataSource as any, adapter as unknown as FastApiPredictionAdapter);
    await expect(service.obtener('player')).resolves.toMatchObject({ estado: 'disponible', cotizacionActual: '18.25', cotizacionPredicha: expect.any(String), versionModelo: 'model-1' });
  });

  it('rechaza jugadores inexistentes', async () => {
    const { service } = crearServicio({ player: null });
    await expect(service.obtener('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('informa no disponible cuando no hay estrategia activa', async () => {
    const { service } = crearServicio({ activeStrategy: 'unknown' });
    await expect(service.obtener('player')).resolves.toMatchObject({
      estado: 'no_disponible',
      cotizacionActual: null,
      versionEstrategia: null,
    });
  });

  it('informa no disponible cuando no existe una versión de estrategia', async () => {
    const { service } = crearServicio({ strategyVersion: null });
    await expect(service.obtener('player')).resolves.toMatchObject({
      estado: 'no_disponible',
      mensaje: 'No hay una estrategia de cotizacion disponible.',
    });
  });

  it('informa no disponible cuando el jugador no tiene estadísticas', async () => {
    const { service } = crearServicio({
      player: { jugador: { posicion: null }, estadisticas: [{ goles: null, asistencias: null, tiros: null, pasesClave: null, regates: null, faltasCometidas: null, ratingWhoScored: null }] },
    });
    await expect(service.obtener('player')).resolves.toMatchObject({
      estado: 'no_disponible',
      mensaje: 'No hay estadisticas suficientes para predecir.',
    });
  });

  it('convierte la indisponibilidad técnica de FastAPI en 503', async () => {
    const { service } = crearServicio({ adapterError: new FastApiTechnicalError('network') });
    await expect(service.obtener('player')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('usa valores por defecto cuando FastAPI no informa origen de datos', async () => {
    const { service, adapter } = crearServicio({
      prediction: {
        estado: 'ready',
        versionModelo: 'model-2',
        estadisticasPredichas: { goles: '-1', asistencias: '1.5', tiros: '2', pasesClave: '3', regates: '4', faltasCometidas: '0', ratingWhoScored: '7' },
      },
    });
    const result = await service.obtener('player');
    expect(result).toMatchObject({ estado: 'disponible', origenDatos: ['whoscored'], versionModelo: 'model-2' });
    expect(adapter.predecir).toHaveBeenCalledWith(expect.objectContaining({ position: 'Forward' }));
  });

  it('mapea errores de validación y técnicos del entrenamiento', async () => {
    const { service, adapter } = crearServicio();
    adapter.entrenar.mockRejectedValueOnce(new FastApiTrainingValidationError('invalid'));
    await expect(service.entrenar({ origenDatos: 'whoscored' })).rejects.toBeInstanceOf(UnprocessableEntityException);

    adapter.entrenar.mockRejectedValueOnce(new FastApiTechnicalError('down'));
    await expect(service.entrenar({ origenDatos: 'whoscored' })).rejects.toBeInstanceOf(ServiceUnavailableException);

    const result = { estado: 'entrenado', versionModelo: 'model-3' } as any;
    adapter.entrenar.mockResolvedValueOnce(result);
    await expect(service.entrenar({ origenDatos: 'whoscored' })).resolves.toBe(result);
  });
});
