import { validate } from 'class-validator';
import { ConfigService } from '@nestjs/config';
import { validateEnvironment } from '../../../src/config/environment';
import { SuperadminBootstrapService } from '../../../src/auth/superadmin-bootstrap.service';
import { LoginDto } from '../../../src/auth/dto/login.dto';
import { User, UserRole } from '../../../src/users/domain/user';

describe('superadmin compartido', () => {
  it('valida sus credenciales, lo crea con contraseña hasheada y permite el login', async () => {
    const environment = validateEnvironment({
      DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/football_market',
      JWT_SECRET: 'secret-de-prueba-con-al-menos-32-caracteres',
      CATALOG_REFRESH_API_KEY:
        'catalog-refresh-test-fixture-key-2026-09-29-abcdefghijklmnopqrstuvwxyz',
      SUPERADMIN_EMAIL: 'admin@gmail.com',
      SUPERADMIN_PASSWORD: 'admin',
    });
    const config = {
      get: jest.fn((key: string) =>
        key === 'SUPERADMIN_EMAIL'
          ? environment.SUPERADMIN_EMAIL
          : key === 'SUPERADMIN_PASSWORD'
            ? environment.SUPERADMIN_PASSWORD
            : undefined,
      ),
    } as unknown as ConfigService;
    const repository = {
      findByEmail: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(async (user: User) => user),
    } as any;
    const hasher = { hash: jest.fn().mockResolvedValue('hash-admin') } as any;
    const service = new SuperadminBootstrapService(config, repository, hasher);

    await service.onApplicationBootstrap();

    expect(hasher.hash).toHaveBeenCalledWith('admin');
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        correo: 'admin@gmail.com',
        passwordHash: 'hash-admin',
        rol: UserRole.SUPERADMIN,
      }),
    );
    expect(
      await validate(
        Object.assign(new LoginDto(), {
          correo: 'admin@gmail.com',
          password: 'admin',
        }),
      ),
    ).toHaveLength(0);
  });
});
