import { Equipo } from '../../../src/players/domain/equipo';
import { Jugador } from '../../../src/players/domain/jugador';
import { Liga } from '../../../src/players/domain/liga';

describe('Dominio del catálogo de jugadores', () => {
  it('normaliza una liga y conserva los datos opcionales', () => {
    const liga = Liga.crear({ proveedorId: 2021, codigo: ' pl ', nombre: ' Premier League ' });

    expect(liga.codigo).toBe('PL');
    expect(liga.nombre).toBe('Premier League');
    expect(liga.emblemaUrl).toBeNull();
  });

  it('rechaza entidades sin datos obligatorios', () => {
    expect(() => Liga.crear({ proveedorId: 0, codigo: 'PL', nombre: 'Premier League' })).toThrow(
      'identificador externo',
    );
    expect(() => Equipo.crear({ proveedorId: 1, ligaId: 'liga', nombre: ' ' })).toThrow(
      'nombre del equipo',
    );
    expect(
      () =>
        Jugador.crear({
          proveedorId: 44,
          equipoId: 'equipo',
          nombre: 'Cristiano Ronaldo',
          fechaNacimiento: 'fecha-invalida',
        }),
    ).toThrow('fecha de nacimiento');
  });

  it('valida fechas reales sin depender de una zona horaria', () => {
    const jugador = Jugador.crear({
      proveedorId: 44,
      equipoId: 'equipo',
      nombre: 'Cristiano Ronaldo',
      fechaNacimiento: '1985-02-05T00:00:00Z',
    });

    expect(jugador.fechaNacimiento).toBe('1985-02-05');
  });
});
