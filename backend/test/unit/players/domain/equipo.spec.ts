import { Equipo } from '../../../../src/players/domain/equipo';
import { Liga } from '../../../../src/players/domain/liga';

describe('Equipo', () => {
  it('queda asociado a una liga', () => {
    const liga = Liga.crear({ codigo: 'serie-a', nombre: 'Serie A' });
    const equipo = Equipo.crear({ nombre: ' Inter ', liga });

    expect(equipo.nombre).toBe('Inter');
    expect(equipo.ligaId).toBe(liga.id);
  });

  it('rechaza un nombre vacío', () => {
    const liga = Liga.crear({ codigo: 'serie-a', nombre: 'Serie A' });
    expect(() => Equipo.crear({ nombre: ' ', liga })).toThrow(
      'El campo nombre de equipo es obligatorio.',
    );
  });
});
