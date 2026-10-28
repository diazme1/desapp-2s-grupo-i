import {
  QuoteOpening,
  QuoteOpeningWriter,
  QuoteOpeningTransaction,
} from '../../quotes/quote-opening-writer';

export class TypeOrmQuoteOpeningWriter implements QuoteOpeningWriter {
  async escribir(
    apertura: QuoteOpening,
    transaction: QuoteOpeningTransaction,
  ): Promise<void> {
    await transaction.insertarApertura({
      id: apertura.id,
      jugadorId: apertura.jugadorId,
      fechaHora: apertura.fechaHora,
      cotizacion: apertura.cotizacion.toDecimalString(),
      idVersionEstrategia: apertura.idVersionEstrategia,
      tipoEstrategia: 'apertura_mercado',
    });
  }
}
