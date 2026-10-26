import { TypeOrmUserRepository } from '../../../src/users/persistence/typeorm-user.repository';
import { UserEntity } from '../../../src/users/persistence/user.entity';
import { SaldoUsuarioEntity } from '../../../src/users/persistence/saldo-usuario.entity';
import { User } from '../../../src/users/domain/user';
import { Creditos } from '../../../src/market/domain/creditos';

describe('TypeOrmUserRepository', () => {
  it('ejecuta usuario y saldo en la misma transacción y propaga rollback', async () => {
    const user = User.create({
      id: 'user-id',
      correo: 'user@example.com',
      passwordHash: 'hash',
    });
    const userRepository = {
      create: jest.fn().mockReturnValue(user),
      save: jest.fn().mockResolvedValue(user),
    };
    const balanceRepository = {
      save: jest.fn().mockRejectedValue(new Error('saldo falló')),
    };
    const manager: any = {
      getRepository: jest.fn((entity: unknown) =>
        entity === UserEntity ? userRepository : balanceRepository,
      ),
    };
    const dataSource = {
      transaction: jest.fn(async (work: (manager: any) => Promise<unknown>) =>
        work(manager),
      ),
    } as any;
    const repository = new TypeOrmUserRepository(dataSource);

    await expect(
      repository.create(user, { saldoInicial: Creditos.inicial() }),
    ).rejects.toThrow('saldo falló');
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(userRepository.save).toHaveBeenCalledTimes(1);
    expect(balanceRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ creditosDisponibles: 1_000_000n }),
    );
    expect(manager.getRepository).toHaveBeenCalledWith(SaldoUsuarioEntity);
  });
});
