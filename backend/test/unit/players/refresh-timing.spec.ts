import { ActualizarCatalogoService } from '../../../src/players/actualizar-catalogo.service';
import { Equipo } from '../../../src/players/domain/equipo';
import { Jugador } from '../../../src/players/domain/jugador';
import { Liga } from '../../../src/players/domain/liga';
import { CatalogoBase, PlayersRepository } from '../../../src/players/players.repository';

function catalogo(): CatalogoBase {
  const liga = Liga.crear({
    id: '3f1f8e5f-e2b9-4f4a-9d25-06c248d78e5b',
    proveedorId: 2021,
    codigo: 'PL',
    nombre: 'Premier League',
  });
  const equipo = Equipo.crear({
    id: 'd21b7e37-50a7-4da6-bfcb-4f4ecb7b7b99',
    proveedorId: 65,
    ligaId: liga.id,
    nombre: 'Manchester City FC',
  });
  const jugador = Jugador.crear({
    id: '8f4cf5a8-5b15-4d07-8f89-ecbdeec1f0fc',
    proveedorId: 44,
    equipoId: equipo.id,
    nombre: 'Cristiano Ronaldo',
  });
  return { ligas: [liga], equipos: [equipo], jugadores: [jugador] };
}

describe('Tiempo de extracción del catálogo', () => {
  it('devuelve el tiempo de extracción en milisegundos y en formato legible', async () => {
    const repository: jest.Mocked<PlayersRepository> = {
      guardarCatalogo: jest.fn().mockResolvedValue({ ligas: 1, equipos: 1, jugadores: 1 }),
      listar: jest.fn(),
      buscarPorId: jest.fn(),
    };
    const source = {
      obtenerCatalogo: jest.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return catalogo();
      }),
    };
    const service = new ActualizarCatalogoService(source, repository);

    const response = await service.ejecutar('PL');

    expect(response.tiempoExtraccionMs).toEqual(expect.any(Number));
    expect(response.tiempoExtraccionMs).toBeGreaterThanOrEqual(0);
    expect(response.tiempoExtraccion).toMatch(/^\d+\.\d{2} s$/);
  });
});
