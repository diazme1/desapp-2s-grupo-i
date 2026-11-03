import { FastApiPredictionAdapter } from '../../../src/ml-players/fastapi-prediction.adapter';
import { MlPredictionService } from '../../../src/ml-players/ml-prediction.service';

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
});
