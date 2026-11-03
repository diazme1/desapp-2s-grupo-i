import { ConfigService } from '@nestjs/config';
import {
  FastApiPredictionAdapter,
  FastApiTechnicalError,
  FastApiTrainingValidationError,
} from '../../../src/ml-players/fastapi-prediction.adapter';

describe('FastApiPredictionAdapter', () => {
  afterEach(() => jest.restoreAllMocks());

  it('envia el token interno y acepta estadisticas sin cotizacion', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ estado: 'ready', versionModelo: 'm1', estadisticasPredichas: { goles: '1' } }), { status: 200 }));
    const adapter = new FastApiPredictionAdapter(new ConfigService({ ML_FASTAPI_BASE_URL: 'http://ml', ML_FASTAPI_INTERNAL_TOKEN: 'secret', ML_FASTAPI_TIMEOUT_MS: 1000 }));
    const result = await adapter.predecir({ fechaGeneracion: '2026-01-01T00:00:00Z', fechaObjetivo: '2026-01-16', position: 'forward', features: {} });
    expect(result.estado).toBe('ready');
    expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({ 'X-ML-Internal-Token': 'secret' });
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.position).toBe('forward');
    expect(body).not.toHaveProperty('idJugador');
  });

  it('traduce fallas tecnicas como error distinguible', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('network'));
    const adapter = new FastApiPredictionAdapter(new ConfigService({ ML_FASTAPI_TIMEOUT_MS: 10 }));
    await expect(adapter.predecir({ fechaGeneracion: '2026-01-01T00:00:00Z', fechaObjetivo: '2026-01-16', features: {} })).rejects.toBeInstanceOf(FastApiTechnicalError);
  });

  it('acepta la ausencia inicial de un modelo como estado válido', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ estado: 'no_model_loaded' }), { status: 200 }),
    );
    const adapter = new FastApiPredictionAdapter(new ConfigService());

    await expect(adapter.predecir({
      fechaGeneracion: '2026-01-01T00:00:00Z',
      fechaObjetivo: '2026-01-16',
      features: {},
    })).resolves.toEqual({ estado: 'no_model_loaded' });
  });

  it.each([
    { estado: 'unexpected' },
    { estado: 'ready', versionModelo: 'm1' },
    { estado: 'ready', estadisticasPredichas: { goles: '1' } },
  ])('rechaza una respuesta de predicción inválida: %#', async (body) => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(body), { status: 200 }),
    );
    const adapter = new FastApiPredictionAdapter(new ConfigService());

    await expect(adapter.predecir({
      fechaGeneracion: '2026-01-01T00:00:00Z',
      fechaObjetivo: '2026-01-16',
      features: {},
    })).rejects.toBeInstanceOf(FastApiTechnicalError);
  });

  it('traduce una respuesta HTTP de error de predicción', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response('', { status: 500 }));
    const adapter = new FastApiPredictionAdapter(new ConfigService());

    await expect(adapter.predecir({
      fechaGeneracion: '2026-01-01T00:00:00Z',
      fechaObjetivo: '2026-01-16',
      features: {},
    })).rejects.toBeInstanceOf(FastApiTechnicalError);
  });

  it('devuelve version y metricas cuando el entrenamiento finaliza', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      estado: 'entrenado',
      versionModelo: 'model-1',
      versionDataset: 'dataset-1',
      versionTransformaciones: 'transform-1',
      origenDatos: 'synthetic',
      cantidadSnapshots: 6,
      cantidadEjemplos: 5,
      metricas: { prueba: { mae: {}, rmse: {} } },
    }), { status: 200 }));
    const adapter = new FastApiPredictionAdapter(new ConfigService({ ML_FASTAPI_TRAINING_TIMEOUT_MS: 1000 }));
    await expect(adapter.entrenar({ origenDatos: 'synthetic', snapshots: [] })).resolves.toMatchObject({ estado: 'entrenado', versionModelo: 'model-1', metricas: expect.any(Object) });
  });

  it('distingue errores de validación del dataset durante el entrenamiento', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response('dataset insuficiente', { status: 422 }));
    const adapter = new FastApiPredictionAdapter(new ConfigService());

    await expect(adapter.entrenar({ origenDatos: 'whoscored' }))
      .rejects.toBeInstanceOf(FastApiTrainingValidationError);
  });

  it('incluye el detalle cuando FastAPI devuelve un error de entrenamiento', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response('fallo interno', { status: 500 }));
    const adapter = new FastApiPredictionAdapter(new ConfigService());

    await expect(adapter.entrenar({ origenDatos: 'app' }))
      .rejects.toBeInstanceOf(FastApiTechnicalError);
  });

  it('rechaza una respuesta de entrenamiento incompleta', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ estado: 'entrenado', versionModelo: 'model-1' }), { status: 200 }),
    );
    const adapter = new FastApiPredictionAdapter(new ConfigService());

    await expect(adapter.entrenar({ origenDatos: 'whoscored' }))
      .rejects.toBeInstanceOf(FastApiTechnicalError);
  });

  it('traduce una falla de red del entrenamiento', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('network'));
    const adapter = new FastApiPredictionAdapter(new ConfigService());

    await expect(adapter.entrenar({ origenDatos: 'synthetic' }))
      .rejects.toBeInstanceOf(FastApiTechnicalError);
  });
});
