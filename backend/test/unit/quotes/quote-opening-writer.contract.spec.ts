import { Cotizacion } from '../../../src/market/domain/cotizacion';
import { QuoteOpeningWriter } from '../../../src/quotes/quote-opening-writer';

describe('QuoteOpeningWriter', () => {
  it('define una escritura interna exacta y separada de la lectura', async () => {
    const transaction = { insertarApertura: jest.fn().mockResolvedValue(undefined) };
    const writer: QuoteOpeningWriter = {
      escribir: jest.fn().mockResolvedValue(undefined),
    };
    const apertura = {
      id: 'quote-id',
      jugadorId: 'player-id',
      fechaHora: new Date(),
      cotizacion: Cotizacion.APERTURA,
      idVersionEstrategia: 'version-id',
    };

    await writer.escribir(apertura, transaction);
    expect(writer.escribir).toHaveBeenCalledWith(apertura, transaction);
    expect(apertura.cotizacion.toUnidades()).toBe(100n);
  });
});
