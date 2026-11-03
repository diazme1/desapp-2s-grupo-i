import {
  escalaDeEstadistica,
  normalizarEstadisticasPredichas,
} from '../../../src/ml-players/domain/estadisticas-predichas';

describe('estadisticas predichas', () => {
  it('ajusta negativos a cero y redondea enteros half-up', () => {
    const result = normalizarEstadisticasPredichas({ goles: 1.5, asistencias: -2, rating: -1, tiros: 2.3456 });
    expect(result.goles).toBe('2');
    expect(result.asistencias).toBe('0');
    expect(result.rating).toBe('0.000');
    expect(result.tiros).toBe('2.346');
  });

  it('expone la escala declarada para estadísticas enteras y continuas', () => {
    expect(escalaDeEstadistica('goles')).toBe(0);
    expect(escalaDeEstadistica('rating')).toBe(3);
  });

  it('usa cero para valores faltantes y normaliza todas las estadísticas esperadas', () => {
    expect(normalizarEstadisticasPredichas({})).toEqual({
      goles: '0',
      asistencias: '0',
      tiros: '0.000',
      pasesClave: '0.000',
      regates: '0.000',
      faltasCometidas: '0.000',
      rating: '0.000',
    });
  });

  it('rechaza valores no numéricos', () => {
    expect(() => normalizarEstadisticasPredichas({ rating: 'no-numérico' })).toThrow(
      'La estadistica predicha no es numerica.',
    );
  });
});
