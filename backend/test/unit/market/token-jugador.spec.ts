import { TokenJugador } from '../../../src/market/domain/token-jugador';

describe('TokenJugador', () => {
  const base = {
    jugadorId: 'player-id',
    usuarioOwnerId: 'owner-id',
    loteEmisionId: 'batch-id',
  };

  it('protege el rango de emisión y no contiene cotización', () => {
    const token = TokenJugador.emitir({ ...base, numeroEmision: 1 });
    expect(token.numeroEmision).toBe(1);
    expect(token).not.toHaveProperty('cotizacion');
    expect(() => TokenJugador.emitir({ ...base, numeroEmision: 0 })).toThrow();
    expect(() => TokenJugador.emitir({ ...base, numeroEmision: 101 })).toThrow();
  });

  it('cambia propietario mediante una operación de dominio', () => {
    const token = TokenJugador.emitir({ ...base, numeroEmision: 1 });
    const transferido = token.transferirA('new-owner');
    expect(transferido.usuarioOwnerId).toBe('new-owner');
    expect(transferido.idToken).toBe(token.idToken);
  });
});
