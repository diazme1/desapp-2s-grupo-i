import { ServiceUnavailableException } from '@nestjs/common';
import { ActualizarCatalogoService } from '../../../src/players/actualizar-catalogo.service';
import { CatalogoJugadoresService } from '../../../src/players/catalogo-jugadores.service';
import { Equipo } from '../../../src/players/domain/equipo';
import { Jugador } from '../../../src/players/domain/jugador';
import { Liga } from '../../../src/players/domain/liga';
import { CatalogoBase, PlayersRepository } from '../../../src/players/players.repository';

function catalogo(): CatalogoBase {
  const liga = Liga.crear({ id: '3f1f8e5f-e2b9-4f4a-9d25-06c248d78e5b', proveedorId: 2021, codigo: 'PL', nombre: 'Premier League' });
  const equipo = Equipo.crear({ id: 'd21b7e37-50a7-4da6-bfcb-4f4ecb7b7b99', proveedorId: 65, ligaId: liga.id, nombre: 'Manchester City FC' });
  const jugador = Jugador.crear({ id: '8f4cf5a8-5b15-4d07-8f89-ecbdeec1f0fc', proveedorId: 44, equipoId: equipo.id, nombre: 'Cristiano Ronaldo' });
  return { ligas: [liga], equipos: [equipo], jugadores: [jugador] };
}

describe('Servicios del catálogo de jugadores', () => {
  it('coordina fuente y persistencia y devuelve el resumen', async () => {
    const repository: jest.Mocked<PlayersRepository> = {
      guardarCatalogo: jest.fn().mockResolvedValue({ ligas: 1, equipos: 1, jugadores: 1 }),
      listar: jest.fn(),
      buscarPorId: jest.fn(),
    };
    const source = { obtenerCatalogo: jest.fn().mockResolvedValue(catalogo()) };
    const service = new ActualizarCatalogoService(source, repository);

    await expect(service.ejecutar()).resolves.toMatchObject({
      fuente: 'Football-Data.org',
      ligas: 1,
      equipos: 1,
      jugadores: 1,
    });
    expect(repository.guardarCatalogo).toHaveBeenCalledWith(expect.objectContaining({ ligas: expect.any(Array) }));
  });

  it('no persiste cuando falla la fuente externa', async () => {
    const repository: jest.Mocked<PlayersRepository> = {
      guardarCatalogo: jest.fn(),
      listar: jest.fn(),
      buscarPorId: jest.fn(),
    };
    const service = new ActualizarCatalogoService(
      { obtenerCatalogo: jest.fn().mockRejectedValue(new Error('caída')) },
      repository,
    );

    await expect(service.ejecutar()).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(repository.guardarCatalogo).not.toHaveBeenCalled();
  });

  it('rechaza el detalle cuando el repository no encuentra el jugador', async () => {
    const repository: jest.Mocked<PlayersRepository> = {
      guardarCatalogo: jest.fn(),
      listar: jest.fn().mockResolvedValue([]),
      buscarPorId: jest.fn().mockResolvedValue(null),
    };
    const service = new CatalogoJugadoresService(repository);

    await expect(service.buscarPorId('8f4cf5a8-5b15-4d07-8f89-ecbdeec1f0fc')).rejects.toThrow(
      'no existe',
    );
  });
});
