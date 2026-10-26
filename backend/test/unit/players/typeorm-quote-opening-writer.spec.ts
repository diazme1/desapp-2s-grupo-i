import { Cotizacion } from '../../../src/market/domain/cotizacion';
import { TypeOrmQuoteOpeningWriter } from '../../../src/players/persistence/typeorm-quote-opening-writer';

describe('TypeOrmQuoteOpeningWriter', () => {
  it('persiste una apertura mediante el contexto transaccional y conserva Cotizacion', async () => {
    const transaction = { insertarApertura: jest.fn().mockResolvedValue(undefined) };
    await new TypeOrmQuoteOpeningWriter().escribir(
      {
        id: 'quote-id',
        jugadorId: 'player-id',
        fechaHora: new Date(),
        cotizacion: Cotizacion.fromUnidades(100n),
        idVersionEstrategia: 'version-id',
      },
      transaction,
    );
    expect(transaction.insertarApertura).toHaveBeenCalledWith(
      expect.objectContaining({
        tipoEstrategia: 'apertura_mercado',
        cotizacion: '1.00',
      }),
    );
  });
});
