import { EstadisticasJugadorService } from '../../../src/players/estadisticas-jugador.service';
import { FakePlayersRepository } from './support/fake-players.repository';
import { FakeWhoScoredAdapter } from './support/fake-whoscored.adapter';

describe('identidad del servicio de estadisticas', () => {
  it.each(['jugador_no_encontrado', 'matching_ambiguo'] as const)(
    'no invoca el writer para %s',
    async (estado) => {
      const jugadores = new FakePlayersRepository();
      const whoscored = new FakeWhoScoredAdapter();
      whoscored.respuesta = { estado };
      const servicio = new EstadisticasJugadorService(jugadores, whoscored, jugadores);

      const resultado = await servicio.obtenerEstadisticasJugador('local-1', 'N', 'E', 'L');

      expect(resultado.estado).toBe(estado);
      expect(jugadores.guardadas).toHaveLength(0);
    },
  );
});
