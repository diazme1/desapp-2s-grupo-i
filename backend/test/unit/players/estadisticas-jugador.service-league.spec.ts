import { EstadisticasJugadorService } from '../../../src/players/estadisticas-jugador.service';
import type { WhoScoredLeagueLookupPort } from '../../../src/players/estadisticas-jugador.service';
import { FakeEstadisticasWriter } from './support/fake-estadisticas-writer';

describe('EstadisticasJugadorService por liga', () => {
  it('persiste solo jugadores locales que coinciden con el feed', async () => {
    const repository = new FakeEstadisticasWriter();
    const whoscored: WhoScoredLeagueLookupPort = {
      obtenerEstadisticasLiga: jest.fn().mockResolvedValue({
        estado: 'exito',
        jugadores: [
          {
            playerIdExterno: 'ws-1',
            nombre: 'Jugador Uno',
            equipo: 'FC Manchester City',
            liga: 'LaLiga',
            metricas: {
              goles: 2,
              asistencias: 1,
              tiros: 3,
              pasesClave: 4,
              regates: 5,
              faltasCometidas: 6.1,
              ratingWhoScored: 7.1,
            },
          },
          {
            playerIdExterno: 'ws-unknown',
            nombre: 'Jugador Externo',
            equipo: 'Otro Equipo',
            liga: 'LaLiga',
            metricas: {
              goles: 9,
              asistencias: null,
              tiros: null,
              pasesClave: null,
              regates: null,
              faltasCometidas: null,
              ratingWhoScored: null,
            },
          },
        ],
      }),
    };
    const service = new EstadisticasJugadorService(whoscored, repository, Date.now, 30_000);

    await expect(
      service.actualizarEstadisticasLiga('Primera Division', [
        {
          idJugador: 'local-1',
          nombreJugador: 'Jugador Uno',
          equipoJugador: 'Manchester City FC',
          ligaEquipoJugador: 'Primera Division',
        },
        {
          idJugador: 'local-2',
          nombreJugador: 'Jugador Dos',
          equipoJugador: 'Manchester United FC',
          ligaEquipoJugador: 'Primera Division',
        },
      ]),
    ).resolves.toMatchObject({
      estado: 'parcial',
      procesados: 2,
      exitosos: 1,
      parciales: 0,
      fallidos: 1,
      motivoSinMatch: 'sin_match_nombre',
    });

    expect(repository.guardadas).toHaveLength(1);
    expect(repository.guardadas[0]).toMatchObject({ idJugador: 'local-1', goles: 2 });
  });

  it('usa el shortName y los aliases del equipo para resolver variantes del feed', async () => {
    const repository = new FakeEstadisticasWriter();
    const whoscored: WhoScoredLeagueLookupPort = {
      obtenerEstadisticasLiga: jest.fn().mockResolvedValue({
        estado: 'exito',
        jugadores: [
          {
            playerIdExterno: 'ws-aaron-martin',
            nombre: 'Aarón Martín',
            equipo: 'Racing Santander',
            liga: 'LaLiga',
            metricas: {
              goles: 0,
              asistencias: 0,
              tiros: 0,
              pasesClave: 1,
              regates: 0,
              faltasCometidas: 1,
              ratingWhoScored: 5.978,
            },
          },
        ],
      }),
    };
    const service = new EstadisticasJugadorService(whoscored, repository);

    await expect(
      service.actualizarEstadisticasLiga('Primera Division', [
        {
          idJugador: 'aaron-martin',
          nombreJugador: 'Aaron Martín',
          equipoJugador: 'Real Racing Club de Santander',
          equipoJugadorAlternativos: ['Racing Santander'],
          ligaEquipoJugador: 'Primera Division',
        },
      ]),
    ).resolves.toMatchObject({
      estado: 'completo',
      procesados: 1,
      exitosos: 1,
      parciales: 0,
      fallidos: 0,
    });

    expect(repository.guardadas).toHaveLength(1);
    expect(repository.guardadas[0]).toMatchObject({
      idJugador: 'aaron-martin',
      goles: 0,
    });
  });

  it.each([
    {
      motivo: 'sin_match_nombre',
      jugador: { nombre: 'Jugador Local', equipo: 'Equipo', liga: 'Primera Division' },
      feed: [{ nombre: 'Otro Jugador', equipo: 'Equipo', liga: 'LaLiga' }],
    },
    {
      motivo: 'sin_match_liga',
      jugador: { nombre: 'Jugador Local', equipo: 'Equipo', liga: 'Primera Division' },
      feed: [{ nombre: 'Jugador Local', equipo: 'Equipo', liga: 'Premier League' }],
    },
    {
      motivo: 'sin_match_equipo',
      jugador: { nombre: 'Jugador Local', equipo: 'Equipo', liga: 'Primera Division' },
      feed: [{ nombre: 'Jugador Local', equipo: 'Otro Equipo', liga: 'LaLiga' }],
    },
    {
      motivo: 'sin_match_completo',
      jugador: { nombre: 'Jugador Local', equipo: 'Equipo', liga: 'Primera Division' },
      feed: [
        { nombre: 'Jugador Local', equipo: 'Equipo', liga: 'LaLiga' },
        { nombre: 'Jugador Local', equipo: 'Equipo', liga: 'LaLiga' },
      ],
    },
  ])('clasifica el motivo agregado $motivo', async ({ motivo, jugador, feed }) => {
    const repository = new FakeEstadisticasWriter();
    const whoscored: WhoScoredLeagueLookupPort = {
      obtenerEstadisticasLiga: jest.fn().mockResolvedValue({
        estado: 'exito',
        jugadores: feed.map((item, index) => ({
          playerIdExterno: `ws-${index}`,
          nombre: item.nombre,
          equipo: item.equipo,
          liga: item.liga,
          metricas: {
            goles: 1,
            asistencias: 1,
            tiros: 1,
            pasesClave: 1,
            regates: 1,
            faltasCometidas: 1,
            ratingWhoScored: 7,
          },
        })),
      }),
    };
    const service = new EstadisticasJugadorService(whoscored, repository);

    await expect(
      service.actualizarEstadisticasLiga('Primera Division', [
        {
          idJugador: 'local-1',
          nombreJugador: jugador.nombre,
          equipoJugador: jugador.equipo,
          ligaEquipoJugador: jugador.liga,
        },
      ]),
    ).resolves.toMatchObject({
      estado: 'sin_estadisticas',
      procesados: 1,
      exitosos: 0,
      parciales: 0,
      fallidos: 1,
      motivoSinMatch: motivo,
    });
  });
});
