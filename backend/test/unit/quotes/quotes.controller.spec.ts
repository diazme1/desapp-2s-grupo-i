import { QuotesController } from '../../../src/quotes/quotes.controller';
import type { RecalcularCotizacionesService } from '../../../src/quotes/recalcular-cotizaciones.service';

describe('QuotesController', () => {
  const configuraciones = [
    {
      tipoEstrategia: 'ataque_decisivo' as const,
      numeroVersion: 2,
      pesos: {
        goles: 40,
        asistencias: 25,
        tiros: 15,
        pasesClave: 5,
        regates: 5,
        rating: 5,
        faltasCometidas: 5,
      },
      persistida: true,
    },
  ];

  it('devuelve las configuraciones para la pantalla de administración', async () => {
    const recalcular = {
      listarConfiguraciones: jest.fn().mockResolvedValue(configuraciones),
      ejecutar: jest.fn(),
    } as unknown as jest.Mocked<RecalcularCotizacionesService>;
    const controller = new QuotesController(recalcular);

    await expect(controller.listarEstrategias()).resolves.toEqual({
      estrategias: configuraciones,
    });
    expect(recalcular.listarConfiguraciones).toHaveBeenCalledTimes(1);
  });

  it('pasa estrategia y pesos configurados al servicio de recálculo', () => {
    const resultado = { jugadoresCotizados: 3 };
    const pesosEstrategias = {
      ataque_decisivo: configuraciones[0].pesos,
    };
    const recalcular = {
      listarConfiguraciones: jest.fn(),
      ejecutar: jest.fn().mockResolvedValue(resultado),
    } as unknown as jest.Mocked<RecalcularCotizacionesService>;
    const controller = new QuotesController(recalcular);

    const response = controller.recalcularCotizaciones({
      estrategia: 'ataque_decisivo',
      pesosEstrategias,
    });

    expect(recalcular.ejecutar).toHaveBeenCalledWith(
      'ataque_decisivo',
      pesosEstrategias,
    );
    expect(response).toBe(recalcular.ejecutar.mock.results[0].value);
  });
});
