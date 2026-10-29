import { Cotizacion } from '../../../src/market/domain/cotizacion';
import { RecalculoCotizacionActivoEntity } from '../../../src/players/persistence/recalculo-cotizacion-activo.entity';
import { TypeOrmOrdersRepository } from '../../../src/orders/persistence/typeorm-orders.repository';

function setup(active: Partial<RecalculoCotizacionActivoEntity> | null, rows: unknown[]) {
  const activeRepository = { findOne: jest.fn().mockResolvedValue(active) };
  const manager = {
    getRepository: jest.fn((entity: unknown) => {
      if (entity === RecalculoCotizacionActivoEntity) return activeRepository;
      throw new Error('No se esperaba otra entidad en el resolver.');
    }),
    query: jest.fn().mockResolvedValue(rows),
  };
  const dataSource = {
    transaction: jest.fn(async (work: (manager: unknown) => unknown) => work(manager)),
  } as any;
  return { repository: new TypeOrmOrdersRepository(dataSource), activeRepository, manager };
}

describe('ActiveQuoteResolver', () => {
  it('devuelve ausencia sin estrategia activa', async () => {
    const setupData = setup(null, []);
    const result = await setupData.repository.enTransaccion((uow) =>
      uow.resolverCotizacionVigente('player-id'),
    );
    expect(result).toBeNull();
    expect(setupData.manager.query).not.toHaveBeenCalled();
  });

  it.each([
    ['sin fila', []],
    ['desalineada', [{ idRecalculo: 'other', tipoEstrategia: 'ataque_decisivo' }]],
  ])('devuelve ausencia cuando la cotización está %s', async (_name, rows) => {
    const setupData = setup(
      { id: 1, idRecalculo: 'recalc-1', tipoEstrategia: 'ataque_decisivo' },
      rows,
    );
    const result = await setupData.repository.enTransaccion((uow) =>
      uow.resolverCotizacionVigente('player-id'),
    );
    expect(result).toBeNull();
  });

  it('lee solo la fila vigente alineada y conserva la precisión', async () => {
    const setupData = setup(
      { id: 1, idRecalculo: 'recalc-1', tipoEstrategia: 'ataque_decisivo' },
      [
        {
          idJugador: 'player-id',
          tipoEstrategia: 'ataque_decisivo',
          cotizacion: '83.75',
          fechaHora: new Date('2026-01-01T00:00:00.000Z'),
          idVersionEstrategia: 'version-1',
          idRecalculo: 'recalc-1',
        },
      ],
    );
    const result = await setupData.repository.enTransaccion((uow) =>
      uow.resolverCotizacionVigente('player-id'),
    );
    expect(result?.cotizacion).toBeInstanceOf(Cotizacion);
    expect(result?.cotizacion.toUnidades()).toBe(8375n);
    expect(setupData.manager.query.mock.calls[0][0]).not.toContain(
      'historial_cotizacion',
    );
  });
});
