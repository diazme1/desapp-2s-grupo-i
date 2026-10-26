import { ConfigService } from '@nestjs/config';
import { SuperadminBootstrapService } from '../../../src/auth/superadmin-bootstrap.service';
import { UserRole } from '../../../src/users/domain/user';

describe('SuperadminBootstrapService y saldo del mercado', () => {
  it('reutiliza create sin solicitar saldo inicial especial', async () => {
    const repository = {
      findByEmail: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(async (user) => user),
    } as any;
    const config = {
      get: jest.fn((key: string) =>
        key === 'SUPERADMIN_EMAIL'
          ? 'admin@example.com'
          : key === 'SUPERADMIN_PASSWORD'
            ? 'secret123'
            : undefined,
      ),
    } as unknown as ConfigService;
    const service = new SuperadminBootstrapService(
      config,
      repository,
      { hash: jest.fn().mockResolvedValue('hash') } as any,
    );

    await service.ensureSuperadmin();

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ rol: UserRole.SUPERADMIN }),
    );
    expect(repository.create.mock.calls[0]).toHaveLength(1);
  });
});
