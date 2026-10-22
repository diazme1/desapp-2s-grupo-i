import { TypeOrmPlayersRepository } from '../../../src/players/persistence/typeorm-players.repository';
import { HistorialCotizacionEntity } from '../../../src/players/persistence/historial-cotizacion.entity';
import { JugadorEntity } from '../../../src/players/persistence/jugador.entity';

describe('TypeOrmPlayersRepository.listarHistorialJugador', () => {
  const playerId = 'd4fd866a-1c58-4423-99eb-56e70a054bb4';
  const quoteId = '9948e5b3-35fa-4104-baf4-93d593fa9a03';
  const statsId = '150b06ef-c482-4584-b4be-17b455b686bd';

  it('ordena de más reciente a más antiguo, pagina y mapea las referencias', async () => {
    const playerRepository = {
      findOne: jest.fn().mockResolvedValue({ id: playerId }),
    };
    const quoteRepository = {
      findAndCount: jest.fn().mockResolvedValue([
        [
          {
            id: quoteId,
            fechaHora: new Date('2026-03-01T00:00:00.000Z'),
            cotizacion: 83.75,
            tipoEstrategia: 'ataque_decisivo',
            idVersionEstrategia: '3b8c2818-ce16-44c2-9c83-22270d745f04',
            idRecalculo: 'c9913672-bf68-49ca-9b0a-521f6f6d8ea4',
            estadistica: { id: statsId },
          } as HistorialCotizacionEntity,
        ],
        8,
      ]),
    };
    const dataSource = {
      getRepository: jest.fn((entity: unknown) =>
        entity === JugadorEntity ? playerRepository : quoteRepository,
      ),
    } as any;
    const repository = new TypeOrmPlayersRepository(dataSource);

    await expect(
      repository.listarHistorialJugador(playerId, 2, 7),
    ).resolves.toEqual({
      items: [
        {
          id: quoteId,
          jugadorId: playerId,
          fechaHora: new Date('2026-03-01T00:00:00.000Z'),
          cotizacion: 83.75,
          tipoEstrategia: 'ataque_decisivo',
          idVersionEstrategia: '3b8c2818-ce16-44c2-9c83-22270d745f04',
          idRecalculo: 'c9913672-bf68-49ca-9b0a-521f6f6d8ea4',
          idEstadistica: statsId,
        },
      ],
      total: 8,
    });
    expect(quoteRepository.findAndCount).toHaveBeenCalledWith({
      where: { jugador: { id: playerId } },
      relations: { estadistica: true },
      order: { fechaHora: 'DESC', id: 'DESC' },
      skip: 7,
      take: 7,
    });
  });

  it('distingue un jugador inexistente de uno sin cotizaciones', async () => {
    const playerRepository = { findOne: jest.fn().mockResolvedValue(null) };
    const quoteRepository = { findAndCount: jest.fn() };
    const dataSource = {
      getRepository: jest.fn((entity: unknown) =>
        entity === JugadorEntity ? playerRepository : quoteRepository,
      ),
    } as any;
    const repository = new TypeOrmPlayersRepository(dataSource);

    await expect(
      repository.listarHistorialJugador(playerId, 1, 20),
    ).resolves.toBeNull();
    expect(quoteRepository.findAndCount).not.toHaveBeenCalled();
  });
});
