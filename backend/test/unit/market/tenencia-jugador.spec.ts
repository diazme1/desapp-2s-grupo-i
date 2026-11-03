import { TenenciaJugador } from '../../../src/market/domain/tenencia-jugador';

describe('TenenciaJugador', () => {
  it('protege la cantidad entera entre cero y cien', () => {
    const tenencia = TenenciaJugador.crear({
      usuarioId: 'user-id',
      jugadorId: 'player-id',
      cantidadTokens: 100,
    });
    expect(tenencia.actualizarCantidad(0).cantidadTokens).toBe(0);
    expect(() => tenencia.actualizarCantidad(-1)).toThrow();
    expect(() => tenencia.actualizarCantidad(101)).toThrow();
  });
});
