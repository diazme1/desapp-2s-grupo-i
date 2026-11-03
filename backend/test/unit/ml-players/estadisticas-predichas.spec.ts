import { normalizarEstadisticasPredichas } from '../../../src/ml-players/domain/estadisticas-predichas';

describe('estadisticas predichas', () => {
  it('ajusta negativos a cero y redondea enteros half-up', () => {
    const result = normalizarEstadisticasPredichas({ goles: 1.5, asistencias: -2, rating: -1, tiros: 2.3456 });
    expect(result.goles).toBe('2');
    expect(result.asistencias).toBe('0');
    expect(result.rating).toBe('0.000');
    expect(result.tiros).toBe('2.346');
  });
});
