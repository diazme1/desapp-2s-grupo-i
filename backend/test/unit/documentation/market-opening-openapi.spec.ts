import { CotizacionHistorialItemResponseDto } from '../../../src/quotes/dto/historial-cotizacion-response.dto';
import { Cotizacion } from '../../../src/market/domain/cotizacion';

describe('compatibilidad OpenAPI de la apertura de mercado', () => {
  it('convierte Cotizacion a número solo en la presentación y permite procedencias nulas', () => {
    const dto = CotizacionHistorialItemResponseDto.from({
      id: 'quote-id',
      jugadorId: 'player-id',
      fechaHora: new Date('2026-01-01T00:00:00.000Z'),
      cotizacion: Cotizacion.APERTURA,
      tipoEstrategia: 'apertura_mercado',
      idVersionEstrategia: 'version-id',
      idRecalculo: null,
      idEstadistica: null,
    });

    expect(dto.cotizacion).toBe(1);
    expect(dto.idRecalculo).toBeNull();
    expect(dto.idEstadistica).toBeNull();
  });
});
