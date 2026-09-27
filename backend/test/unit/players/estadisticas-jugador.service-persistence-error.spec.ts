import { EstadisticasJugadorService } from '../../../src/players/estadisticas-jugador.service';
import { FakePlayersRepository } from './support/fake-players.repository';
import { FakeWhoScoredAdapter } from './support/fake-whoscored.adapter';

describe('error de persistencia', () => {
  it('devuelve error_persistencia sin dejar una fila parcial ni modificar al jugador', async () => {
    const jugadores = new FakePlayersRepository();
    jugadores.errorDeEscritura = new Error('fallo de base de datos');
    const whoscored = new FakeWhoScoredAdapter();
    const servicio = new EstadisticasJugadorService(jugadores, whoscored, jugadores);

    const resultado = await servicio.obtenerEstadisticasJugador('local-1', 'N', 'E', 'L');

    expect(resultado.estado).toBe('error_persistencia');
    expect(jugadores.guardadas).toHaveLength(0);
  });
});
