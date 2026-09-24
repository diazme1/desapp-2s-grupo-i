import { readFileSync } from 'node:fs';
import { EstadisticasJugadorService } from '../../../src/players/estadisticas-jugador.service';
import { FakePlayersRepository } from './support/fake-players.repository';
import { FakeWhoScoredAdapter } from './support/fake-whoscored.adapter';

interface ExpectedPlayer {
  idJugador: string;
  playerIdExterno: string;
  nombre: string;
  equipo: string;
  liga: string;
  goles: number;
  asistencias: number;
  tiros: number;
  pasesClave: number;
  regates: number;
  entradas: number;
  ratingWhoScored: number;
}

const players = JSON.parse(
  readFileSync(`${__dirname}/fixtures/whoscored/twenty-players.expected.json`, 'utf8'),
) as ExpectedPlayer[];

describe('SC-005: asociacion de 20 jugadores', () => {
  it('mantiene las siete metricas y el idJugador independiente en cada caso', async () => {
    const jugadores = new FakePlayersRepository();
    const whoscored = new FakeWhoScoredAdapter();
    const servicio = new EstadisticasJugadorService(jugadores, whoscored, jugadores);

    for (const player of players) {
      whoscored.respuesta = {
        estado: 'exito_completo',
        identidad: {
          playerIdExterno: player.playerIdExterno,
          nombre: player.nombre,
          equipo: player.equipo,
          liga: player.liga,
        },
        metricas: {
          goles: player.goles,
          asistencias: player.asistencias,
          tiros: player.tiros,
          pasesClave: player.pasesClave,
          regates: player.regates,
          entradas: player.entradas,
          ratingWhoScored: player.ratingWhoScored,
        },
      };

      const resultado = await servicio.obtenerEstadisticasJugador(
        player.idJugador,
        player.nombre,
        player.equipo,
        player.liga,
      );

      expect(resultado.estado).toBe('exito_completo');
      const guardada = jugadores.guardadas.at(-1);
      expect(guardada).toMatchObject({
        idJugador: player.idJugador,
        goles: player.goles,
        asistencias: player.asistencias,
        tiros: player.tiros,
        pasesClave: player.pasesClave,
        regates: player.regates,
        entradas: player.entradas,
        ratingWhoScored: player.ratingWhoScored,
      });
    }

    expect(players).toHaveLength(20);
    expect(new Set(jugadores.guardadas.map((item) => item.idJugador)).size).toBe(20);
  });
});
