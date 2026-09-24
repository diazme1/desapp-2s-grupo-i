import { EstadisticasJugadorService } from '../../../src/players/estadisticas-jugador.service';
import { FakePlayersRepository } from './support/fake-players.repository';
import { FakeWhoScoredAdapter } from './support/fake-whoscored.adapter';

describe('EstadisticasJugadorService', () => {
  function crearServicio() {
    const jugadores = new FakePlayersRepository();
    const whoscored = new FakeWhoScoredAdapter();
    return {
      jugadores,
      whoscored,
      servicio: new EstadisticasJugadorService(jugadores, whoscored, jugadores),
    };
  }

  it('recibe los cuatro parametros, consulta WhoScored y persiste por idJugador', async () => {
    const { jugadores, whoscored, servicio } = crearServicio();

    const resultado = await servicio.obtenerEstadisticasJugador(
      'local-1',
      'Jugador Uno',
      'Equipo Uno',
      'Liga Uno',
    );

    expect(resultado.estado).toBe('exito_completo');
    expect(resultado.idJugador).toBe('local-1');
    expect(jugadores.guardadas).toHaveLength(1);
    expect(jugadores.guardadas[0].idJugador).toBe('local-1');
    expect(whoscored.ultimaEntrada).toEqual({
      nombreJugador: 'Jugador Uno',
      equipoJugador: 'Equipo Uno',
      ligaEquipoJugador: 'Liga Uno',
    });
  });

  it.each([
    'jugador_no_encontrado',
    'matching_ambiguo',
    'fuente_no_disponible',
    'estructura_inesperada',
    'sin_estadisticas',
  ] as const)('no persiste cuando WhoScored devuelve %s', async (estado) => {
    const { jugadores, whoscored, servicio } = crearServicio();
    whoscored.respuesta = { estado };

    const resultado = await servicio.obtenerEstadisticasJugador('local-1', 'N', 'E', 'L');

    expect(resultado.estado).toBe(estado);
    expect(jugadores.guardadas).toHaveLength(0);
  });

  it('informa jugador local inexistente sin consultar WhoScored', async () => {
    const { jugadores, whoscored, servicio } = crearServicio();
    jugadores.jugadorExiste = false;

    const resultado = await servicio.obtenerEstadisticasJugador('missing', 'N', 'E', 'L');

    expect(resultado.estado).toBe('jugador_local_inexistente');
    expect(whoscored.ultimaEntrada).toBeUndefined();
    expect(jugadores.guardadas).toHaveLength(0);
  });
});
