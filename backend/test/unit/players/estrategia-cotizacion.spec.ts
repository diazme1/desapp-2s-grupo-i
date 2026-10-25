import {
  EstrategiaCotizacion,
  type EstadisticasParaCotizacion,
  type TipoEstrategiaCotizacion,
} from '../../../src/players/domain/estrategia-cotizacion';

const estadisticas: EstadisticasParaCotizacion = {
  goles: 10,
  asistencias: 5,
  tiros: 2,
  pasesClave: 1,
  regates: 1,
  ratingWhoScored: 7.5,
  faltasCometidas: 1,
};

describe('EstrategiaCotizacion', () => {
  it.each<[TipoEstrategiaCotizacion, string]>([
    ['ataque_decisivo', '6.58'],
    ['creacion_tecnica', '3.98'],
  ])('calcula la estrategia %s con pesos sobre 100', (tipo, esperado) => {
    expect(EstrategiaCotizacion.versionInicial(tipo).calcular(estadisticas)).toBe(
      esperado,
    );
  });

  it('conserva los pesos v1 acordados', () => {
    expect(EstrategiaCotizacion.versionInicial('ataque_decisivo').pesos).toEqual({
      goles: 35,
      asistencias: 25,
      tiros: 20,
      pasesClave: 5,
      regates: 5,
      rating: 5,
      faltasCometidas: 5,
    });
    expect(EstrategiaCotizacion.versionInicial('creacion_tecnica').pesos).toEqual({
      goles: 5,
      asistencias: 15,
      tiros: 5,
      pasesClave: 30,
      regates: 25,
      rating: 15,
      faltasCometidas: 5,
    });
  });

  it('trata nulos como cero y resta el aporte de las faltas', () => {
    const soloGoles: EstadisticasParaCotizacion = {
      goles: 10,
      asistencias: null,
      tiros: null,
      pasesClave: null,
      regates: null,
      ratingWhoScored: null,
      faltasCometidas: null,
    };
    const conFaltas = { ...soloGoles, faltasCometidas: 2 };
    const estrategia = EstrategiaCotizacion.versionInicial('ataque_decisivo');

    expect(estrategia.calcular(soloGoles)).toBe('4.50');
    expect(estrategia.calcular(conFaltas)).toBe('4.40');
  });

  it('redondea centavos con aritmética decimal exacta y limita el mínimo a cero', () => {
    const fraccion: EstadisticasParaCotizacion = {
      goles: 0,
      asistencias: 0,
      tiros: 0,
      pasesClave: 0,
      regates: 0,
      ratingWhoScored: 0.01,
      faltasCometidas: 0,
    };
    const demasiadasFaltas = { ...fraccion, ratingWhoScored: 0, faltasCometidas: 100 };

    expect(
      EstrategiaCotizacion.versionInicial('ataque_decisivo').calcular(fraccion),
    ).toBe('1.00');
    expect(
      EstrategiaCotizacion.versionInicial('ataque_decisivo').calcular(demasiadasFaltas),
    ).toBe('0.00');
  });
});
