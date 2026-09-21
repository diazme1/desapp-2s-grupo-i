import { Equipo } from '../../../../src/players/domain/equipo';
import { Jugador } from '../../../../src/players/domain/jugador';
import { Liga } from '../../../../src/players/domain/liga';

function crearContexto() {
  const liga = Liga.crear({ codigo: 'premier-league', nombre: 'Premier League' });
  const equipo = Equipo.crear({ nombre: 'Arsenal', liga });
  return { liga, equipo };
}

describe('Jugador', () => {
  it('normaliza nombre y posicion y conserva la relacion', () => {
    const { liga, equipo } = crearContexto();
    const jugador = Jugador.crear({
      nombre: '  Bukayo Saka  ',
      posicion: ' Extremo ',
      equipo,
      liga,
    });

    expect(jugador.nombre).toBe('Bukayo Saka');
    expect(jugador.posicion).toBe('extremo');
    expect(jugador.equipo.id).toBe(equipo.id);
    expect(jugador.liga.id).toBe(liga.id);
    expect(jugador.activo).toBe(true);
  });

  it('rechaza equipo y liga inconsistentes', () => {
    const liga = Liga.crear({ codigo: 'premier-league', nombre: 'Premier League' });
    const otraLiga = Liga.crear({ codigo: 'bundesliga', nombre: 'Bundesliga' });
    const equipo = Equipo.crear({ nombre: 'Arsenal', liga });

    expect(() =>
      Jugador.crear({ nombre: 'Jugador', posicion: 'defensa', equipo, liga: otraLiga }),
    ).toThrow('El equipo no pertenece a la liga del jugador.');
  });

  it('rechaza un jugador sin nombre o posicion', () => {
    const { liga, equipo } = crearContexto();
    expect(() => Jugador.crear({ nombre: ' ', posicion: 'delantero', equipo, liga })).toThrow();
    expect(() => Jugador.crear({ nombre: 'Jugador', posicion: ' ', equipo, liga })).toThrow();
  });
});
