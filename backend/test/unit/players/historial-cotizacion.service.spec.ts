import { NotFoundException } from '@nestjs/common';
import { HistorialCotizacionService } from '../../../src/quotes/historial-cotizacion.service';

describe('HistorialCotizacionService', () => {
  it('calcula el total de páginas y delega los filtros al repositorio', async () => {
    const repository = {
      listarHistorialJugador: jest
        .fn()
        .mockResolvedValue({ items: [], total: 41 }),
    };
    const service = new HistorialCotizacionService(repository);

    await expect(
      service.listar('player-id', { page: 3, limit: 20 }),
    ).resolves.toEqual({
      items: [],
      total: 41,
      page: 3,
      limit: 20,
      totalPages: 3,
    });
    expect(repository.listarHistorialJugador).toHaveBeenCalledWith(
      'player-id',
      3,
      20,
    );
  });

  it('responde con 404 cuando el jugador no existe', async () => {
    const repository = {
      listarHistorialJugador: jest.fn().mockResolvedValue(null),
    };
    const service = new HistorialCotizacionService(repository);

    await expect(
      service.listar('missing-id', { page: 1, limit: 20 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
