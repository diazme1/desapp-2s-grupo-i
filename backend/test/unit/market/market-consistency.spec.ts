import { TokenJugador } from '../../../src/market/domain/token-jugador';
import { TenenciaJugador } from '../../../src/market/domain/tenencia-jugador';

describe('consistencia de tokens y tenencias', () => {
  it('mantiene la identidad del token separada de su cotización', () => {
    const token = TokenJugador.emitir({
      jugadorId: 'player-id',
      usuarioOwnerId: 'owner-id',
      numeroEmision: 1,
      loteEmisionId: 'batch-id',
    });
    const tenencia = TenenciaJugador.crear({
      usuarioId: 'owner-id',
      jugadorId: 'player-id',
      cantidadTokens: 1,
    });
    expect(token.jugadorId).toBe(tenencia.jugadorId);
    expect(token).not.toHaveProperty('cotizacion');
  });
});
