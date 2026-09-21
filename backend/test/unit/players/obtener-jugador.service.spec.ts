import { Equipo } from '../../../src/players/domain/equipo';
import { Jugador } from '../../../src/players/domain/jugador';
import { Liga } from '../../../src/players/domain/liga';
import { CatalogoJugadoresService } from '../../../src/players/catalogo-jugadores.service';
import type { JugadorRepository } from '../../../src/players/players.repository';

function crearRepository(): jest.Mocked<JugadorRepository> {
  return {
    listar: jest.fn(),
    buscarActivoPorId: jest.fn(),
    buscarPorIdentidadExterna: jest.fn(),
    guardar: jest.fn(),
    guardarIdentidadExterna: jest.fn(),
  };
}

function crearJugador(id = '30000000-0000-4000-8000-000000000001'): Jugador {
  const liga = Liga.crear({ codigo: 'premier-league', nombre: 'Premier League' });
  const equipo = Equipo.crear({ nombre: 'Arsenal', liga });
  return Jugador.crear({ id, nombre: 'Bukayo Saka', posicion: 'extremo', equipo, liga });
}

describe('CatalogoJugadoresService.obtenerPorId', () => {
  it('devuelve el detalle de un jugador activo', async () => {
    const repository = crearRepository();
    repository.buscarActivoPorId.mockResolvedValue(crearJugador());
    const service = new CatalogoJugadoresService(repository);

    const result = await service.obtenerPorId('30000000-0000-4000-8000-000000000001');

    expect(result.nombre).toBe('Bukayo Saka');
    expect(result.liga.codigo).toBe('premier-league');
  });

  it('rechaza un UUID inexistente con not found', async () => {
    const repository = crearRepository();
    repository.buscarActivoPorId.mockResolvedValue(null);
    const service = new CatalogoJugadoresService(repository);

    await expect(service.obtenerPorId('30000000-0000-4000-8000-000000000099')).rejects.toMatchObject({
      status: 404,
    });
  });

  it('rechaza un identificador con formato invalido con bad request', async () => {
    const repository = crearRepository();
    const service = new CatalogoJugadoresService(repository);

    await expect(service.obtenerPorId('no-es-un-uuid')).rejects.toMatchObject({ status: 400 });
    expect(repository.buscarActivoPorId).not.toHaveBeenCalled();
  });
});
