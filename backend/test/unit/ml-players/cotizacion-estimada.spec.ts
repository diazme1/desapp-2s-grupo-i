import { EstrategiaCotizacion } from '../../../src/players/domain/estrategia-cotizacion';
import { normalizarEstadisticasPredichas } from '../../../src/ml-players/domain/estadisticas-predichas';

describe('cotizacion estimada', () => {
  it('delega el calculo exacto en la estrategia versionada', () => {
    const stats = normalizarEstadisticasPredichas({ goles: 2, asistencias: 1, rating: 7.5 });
    const quote = EstrategiaCotizacion.versionInicial('ataque_decisivo').calcular({ goles: Number(stats.goles), asistencias: Number(stats.asistencias), tiros: Number(stats.tiros), pasesClave: Number(stats.pasesClave), regates: Number(stats.regates), faltasCometidas: Number(stats.faltasCometidas), ratingWhoScored: Number(stats.rating) });
    expect(quote).toMatch(/^\d+\.\d{2}$/);
  });
});
