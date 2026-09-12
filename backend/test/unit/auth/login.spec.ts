import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../../../src/auth/auth.service';
import { User } from '../../../src/users/domain/user';

describe('AuthService login', () => {
  it('emite un token con sub y correo para credenciales válidas', async () => {
    const user = User.create({ correo: 'user@example.com', passwordHash: 'hash' });
    const repository = { findByEmail: jest.fn().mockResolvedValue(user) } as any;
    const hasher = { compare: jest.fn().mockResolvedValue(true) } as any;
    const tokens = { sign: jest.fn().mockReturnValue('jwt'), expirationSeconds: () => 900 } as any;
    const service = new AuthService(repository, hasher, tokens);
    await expect(service.login({ correo: ' USER@example.com ', password: 'secret123' })).resolves.toEqual({
      accessToken: 'jwt',
      tokenType: 'Bearer',
      expiresIn: 900,
    });
    expect(tokens.sign).toHaveBeenCalledWith({ sub: user.id, correo: user.correo });
  });

  it('usa el mismo error para correo inexistente o contraseña incorrecta', async () => {
    const repository = { findByEmail: jest.fn().mockResolvedValue(null) } as any;
    const hasher = { compare: jest.fn() } as any;
    const service = new AuthService(repository, hasher, {} as any);
    await expect(service.login({ correo: 'none@example.com', password: 'secret123' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(hasher.compare).not.toHaveBeenCalled();
  });
});
