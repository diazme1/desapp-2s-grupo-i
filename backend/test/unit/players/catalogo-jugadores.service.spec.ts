import { Equipo } from '../../../src/players/domain/equipo';
import { Jugador } from '../../../src/players/domain/jugador';
import { Liga } from '../../../src/players/domain/liga';
import { CatalogoJugadoresService } from '../../../src/players/catalogo-jugadores.service';
import type { JugadorRepository } from '../../../src/players/players.repository';

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

function crearRepository(): jest.Mocked<JugadorRepository> {
  return {
    listar: jest.fn(),
    buscarActivoPorId: jest.fn(),
    buscarPorIdentidadExterna: jest.fn(),
    guardar: jest.fn(),
    guardarIdentidadExterna: jest.fn(),
  };
}

describe('CatalogoJugadoresService.listar', () => {
  it('aplica filtros normalizados y transforma el modelo a la respuesta publica', async () => {
    const repository = crearRepository();
    repository.listar.mockResolvedValue({ items: [crearJugador()], total: 1 });
    const service = new CatalogoJugadoresService(repository);

    const result = await service.listar({ liga: '  PREMIER-LEAGUE  ', posicion: ' Extremo ' });

    expect(repository.listar).toHaveBeenCalledWith({
      liga: 'premier-league',
      posicion: 'extremo',
      activo: true,
    });
    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({
      id: '30000000-0000-4000-8000-000000000001',
      nombre: 'Bukayo Saka',
      posicion: 'extremo',
      equipo: { nombre: 'Arsenal' },
      liga: { codigo: 'premier-league' },
      activo: true,
    });
    expect(result.items[0]).not.toHaveProperty('externalId');
  });

  it('devuelve una coleccion vacia cuando el repository no encuentra coincidencias', async () => {
    const repository = crearRepository();
    repository.listar.mockResolvedValue({ items: [], total: 0 });
    const service = new CatalogoJugadoresService(repository);

    await expect(service.listar({ equipo: 'Equipo inexistente' })).resolves.toEqual({
      items: [],
      total: 0,
    });
  });
});
