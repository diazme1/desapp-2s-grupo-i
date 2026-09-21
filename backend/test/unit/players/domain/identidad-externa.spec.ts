import { IdentidadExternaJugador } from '../../../../src/players/domain/identidad-externa-jugador';
import { Jugador } from '../../../../src/players/domain/jugador';
import { Equipo } from '../../../../src/players/domain/equipo';
import { Liga } from '../../../../src/players/domain/liga';

function crearJugador(): Jugador {
  const liga = Liga.crear({ codigo: 'premier-league', nombre: 'Premier League' });
  const equipo = Equipo.crear({ nombre: 'Arsenal', liga });
  return Jugador.crear({
    id: '30000000-0000-4000-8000-000000000001',
    nombre: 'Bukayo Saka',
    posicion: 'extremo',
    equipo,
    liga,
  });
}

describe('IdentidadExternaJugador', () => {
  it('normaliza proveedor y externalId', () => {
    const identidad = IdentidadExternaJugador.crear({
      jugadorId: '30000000-0000-4000-8000-000000000001',
      proveedor: ' WhoScored ',
      externalId: ' Player-1 ',
    });

    expect(identidad.proveedor).toBe('whoscored');
    expect(identidad.externalId).toBe('player-1');
  });

  it('requiere proveedor, externalId y jugador', () => {
    expect(() =>
      IdentidadExternaJugador.crear({ jugadorId: '1', proveedor: ' ', externalId: '1' }),
    ).toThrow();
    expect(() =>
      IdentidadExternaJugador.crear({ jugadorId: '1', proveedor: 'whoscored', externalId: ' ' }),
    ).toThrow();
  });

  it('asocia una identidad al jugador correcto y evita duplicarla en memoria', () => {
    const jugador = crearJugador();
    const identidad = IdentidadExternaJugador.crear({
      jugadorId: jugador.id,
      proveedor: 'whoscored',
      externalId: 'player-1',
    });

    jugador.asociarIdentidadExterna(identidad);
    jugador.asociarIdentidadExterna(identidad);

    expect(jugador.identidadesExternas).toHaveLength(1);
    expect(() =>
      jugador.asociarIdentidadExterna(
        IdentidadExternaJugador.crear({
          jugadorId: '30000000-0000-4000-8000-000000000099',
          proveedor: 'whoscored',
          externalId: 'player-2',
        }),
      ),
    ).toThrow('La identidad externa no corresponde al jugador.');
  });
});
