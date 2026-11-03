import { ConfigService } from '@nestjs/config';
import { User, UserRole } from '../../../src/users/domain/user';
import { SuperadminBootstrapService } from '../../../src/auth/superadmin-bootstrap.service';

function makeService(options?: {
  email?: string;
  password?: string;
  existing?: User | null;
}) {
  const config = {
    get: jest.fn((key: string) =>
      key === 'SUPERADMIN_EMAIL'
        ? options?.email
        : key === 'SUPERADMIN_PASSWORD'
          ? options?.password
          : undefined,
    ),
  } as unknown as ConfigService;
  const repository = {
    findByEmail: jest.fn().mockResolvedValue(options?.existing ?? null),
    create: jest.fn().mockImplementation(async (user: User) => user),
  } as any;
  const hasher = { hash: jest.fn().mockResolvedValue('secure-hash') } as any;
  return {
    service: new SuperadminBootstrapService(config, repository, hasher),
    repository,
    hasher,
  };
}

describe('SuperadminBootstrapService', () => {
  it('crea un superadmin una sola vez con contraseña hasheada', async () => {
    const { service, repository, hasher } = makeService({
      email: 'ADMIN@example.com',
      password: 'secret123',
    });

    await service.onApplicationBootstrap();

    expect(hasher.hash).toHaveBeenCalledWith('secret123');
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        correo: 'admin@example.com',
        passwordHash: 'secure-hash',
        rol: UserRole.SUPERADMIN,
      }),
    );
  });

  it('no modifica un superadmin ya existente', async () => {
    const existing = User.create({
      correo: 'admin@example.com',
      passwordHash: 'existing-hash',
      rol: UserRole.SUPERADMIN,
    });
    const { service, repository, hasher } = makeService({
      email: 'admin@example.com',
      password: 'secret123',
      existing,
    });

    await service.onApplicationBootstrap();

    expect(repository.create).not.toHaveBeenCalled();
    expect(hasher.hash).not.toHaveBeenCalled();
  });

  it('no promueve automáticamente una cuenta común existente', async () => {
    const existing = User.create({
      correo: 'admin@example.com',
      passwordHash: 'existing-hash',
    });
    const { service, repository } = makeService({
      email: 'admin@example.com',
      password: 'secret123',
      existing,
    });

    await expect(service.onApplicationBootstrap()).rejects.toThrow(
      'no se promovió automáticamente',
    );
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('no crea ninguna cuenta si no se configuró el bootstrap', async () => {
    const { service, repository } = makeService();

    await service.onApplicationBootstrap();

    expect(repository.findByEmail).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });
});
