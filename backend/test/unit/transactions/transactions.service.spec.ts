import { ConflictException, NotFoundException } from '@nestjs/common';
import { OwnershipService } from '../../../src/auth/ownership/ownership.service';
import { TransactionsService } from '../../../src/transactions/transactions.service';
import type { TransactionsRepository } from '../../../src/transactions/transactions.repository';

const USER_ID = '10000000-0000-4000-8000-000000000001';
const OTHER_USER_ID = '10000000-0000-4000-8000-000000000002';

function repositoryReturning(
  result: Awaited<ReturnType<TransactionsRepository['consultar']>>,
): TransactionsRepository {
  return { consultar: jest.fn().mockResolvedValue(result) };
}

describe('TransactionsService', () => {
  it('verifica ownership antes de consultar el Repository', async () => {
    const repository = repositoryReturning({
      usuarioId: OTHER_USER_ID,
      usuarioExiste: true,
      operaciones: [],
    });
    const service = new TransactionsService(repository, new OwnershipService());

    await expect(service.consultar(USER_ID, OTHER_USER_ID)).rejects.toMatchObject(
      { status: 403 },
    );
    expect(repository.consultar).not.toHaveBeenCalled();
  });

  it('devuelve 404 solo cuando el UUID propio no existe', async () => {
    const service = new TransactionsService(
      repositoryReturning({
        usuarioId: USER_ID,
        usuarioExiste: false,
        operaciones: [],
      }),
      new OwnershipService(),
    );

    await expect(service.consultar(USER_ID, USER_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('devuelve 409 sin lista parcial ante un snapshot inconsistente', async () => {
    const service = new TransactionsService(
      repositoryReturning({
        usuarioId: USER_ID,
        usuarioExiste: true,
        operaciones: [
          {
            idOperacion: '20000000-0000-4000-8000-000000000001',
            tipo: 'COMPRA',
            jugadorId: '30000000-0000-4000-8000-000000000001',
            nombreCompleto: 'Jugador inconsistente',
            cantidadTokens: 1,
            cotizacion: 'no-decimal',
            importeCreditos: 1n,
            fechaHora: new Date(),
          },
        ],
      }),
      new OwnershipService(),
    );

    await expect(service.consultar(USER_ID, USER_ID)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
