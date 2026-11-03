import { DataSource, EntityManager } from 'typeorm';
import { EstrategiaCotizacion } from '../../../src/quotes/domain/estrategia-cotizacion';
import { JugadorEntity } from '../../../src/players/persistence/jugador.entity';
import { TypeOrmQuotesRepository } from '../../../src/quotes/persistence/typeorm-quotes.repository';
import { VersionEstrategiaCotizacionEntity } from '../../../src/quotes/persistence/version-estrategia-cotizacion.entity';
import type { VersionEstrategiaCotizacion } from '../../../src/quotes/domain/estrategia-cotizacion';

function version(
  tipoEstrategia: 'ataque_decisivo' | 'creacion_tecnica',
  numeroVersion: number,
): VersionEstrategiaCotizacionEntity {
  return {
    id: `${tipoEstrategia}-${numeroVersion}`,
    tipoEstrategia,
    numeroVersion,
    pesos: EstrategiaCotizacion.versionInicial(tipoEstrategia).pesos,
    creadoEn: new Date('2026-01-01T00:00:00.000Z'),
  };
}

function preparar(
  versiones: VersionEstrategiaCotizacionEntity[] = [],
  versionUnica: VersionEstrategiaCotizacionEntity | null = null,
) {
  const versionRepository = {
    find: jest.fn().mockResolvedValue(versiones),
    findOne: jest.fn().mockResolvedValue(versionUnica),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
  };
  const jugadorRepository = { count: jest.fn().mockResolvedValue(0) };
  const manager = {
    query: jest.fn().mockResolvedValue([]),
    getRepository: jest.fn((entity: unknown) => {
      if (entity === VersionEstrategiaCotizacionEntity)
        return versionRepository;
      if (entity === JugadorEntity) return jugadorRepository;
      throw new Error('Repositorio no esperado en la prueba.');
    }),
  } as unknown as EntityManager;
  const dataSource = {
    getRepository: jest.fn((entity: unknown) => {
      if (entity === VersionEstrategiaCotizacionEntity)
        return versionRepository;
      throw new Error('Repositorio no esperado en la prueba.');
    }),
    transaction: jest.fn(
      async (operation: (manager: EntityManager) => unknown) =>
        operation(manager),
    ),
  } as unknown as DataSource;
  return {
    repository: new TypeOrmQuotesRepository(dataSource),
    dataSource,
    manager,
    versionRepository,
  };
}

describe('TypeOrmQuotesRepository: versiones de estrategias', () => {
  it('devuelve solo la versión más reciente de cada estrategia', async () => {
    const ataqueVigente = version('ataque_decisivo', 3);
    const tecnicaVigente = version('creacion_tecnica', 2);
    const subject = preparar([
      ataqueVigente,
      version('ataque_decisivo', 2),
      tecnicaVigente,
      version('creacion_tecnica', 1),
    ]);

    const result = await subject.repository.listarUltimasVersionesEstrategia();

    expect(result).toEqual([
      expect.objectContaining({
        id: ataqueVigente.id,
        tipoEstrategia: 'ataque_decisivo',
        numeroVersion: 3,
      }),
      expect.objectContaining({
        id: tecnicaVigente.id,
        tipoEstrategia: 'creacion_tecnica',
        numeroVersion: 2,
      }),
    ]);
    expect(result[0].pesos).not.toBe(ataqueVigente.pesos);
    expect(subject.versionRepository.find).toHaveBeenCalledWith({
      order: { tipoEstrategia: 'ASC', numeroVersion: 'DESC' },
    });
  });

  it('devuelve una lista vacía cuando todavía no hay versiones guardadas', async () => {
    const subject = preparar();

    await expect(
      subject.repository.listarUltimasVersionesEstrategia(),
    ).resolves.toEqual([]);
  });

  it('consulta la última versión y guarda una nueva con sus pesos', async () => {
    const vigente = version('ataque_decisivo', 2);
    const subject = preparar([], vigente);
    const pesos = {
      ...EstrategiaCotizacion.versionInicial('ataque_decisivo').pesos,
      goles: 40,
      tiros: 15,
    };

    const result = await subject.repository.ejecutarEnTransaccion(
      async (unitOfWork) => ({
        anterior:
          await unitOfWork.obtenerUltimaVersionEstrategia('ataque_decisivo'),
        nueva: await unitOfWork.crearVersionEstrategia({
          tipo: 'ataque_decisivo',
          version: 3,
          pesos,
        }),
      }),
    );

    expect(subject.manager.query).toHaveBeenCalledWith(
      'SELECT id FROM recalculo_cotizacion_activo WHERE id = 1 FOR UPDATE',
    );
    expect(subject.versionRepository.findOne).toHaveBeenCalledWith({
      where: { tipoEstrategia: 'ataque_decisivo' },
      order: { numeroVersion: 'DESC' },
    });
    expect(result.anterior).toMatchObject({ id: vigente.id, numeroVersion: 2 });
    expect(subject.versionRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tipoEstrategia: 'ataque_decisivo',
        numeroVersion: 3,
        pesos,
      }),
    );
    expect(result.nueva).toMatchObject({
      tipoEstrategia: 'ataque_decisivo',
      numeroVersion: 3,
      pesos,
    });
    expect(result.nueva.pesos).not.toBe(pesos);
  });

  it('representa la ausencia de una versión anterior como null', async () => {
    const subject = preparar();

    const result = await subject.repository.ejecutarEnTransaccion(
      (unitOfWork) =>
        unitOfWork.obtenerUltimaVersionEstrategia('creacion_tecnica'),
    );

    expect(result).toBeNull();
  });
});
