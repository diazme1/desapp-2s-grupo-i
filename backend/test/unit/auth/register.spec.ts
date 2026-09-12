import { AuthService } from '../../../src/auth/auth.service';

describe('AuthService.register', () => {
  it('hashea la contraseña y devuelve solo datos públicos', async () => {
    const repository = {
      findByEmail: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(async (user) => user),
    } as any;
    const hasher = { hash: jest.fn().mockResolvedValue('bcrypt-hash') } as any;
    const service = new AuthService(repository, hasher, {} as any);

    const response = await service.register({ correo: ' USER@example.com ', password: 'secret123' });

    expect(hasher.hash).toHaveBeenCalledWith('secret123');
    expect(repository.create.mock.calls[0][0].passwordHash).toBe('bcrypt-hash');
    expect(response).not.toHaveProperty('passwordHash');
    expect(response.correo).toBe('user@example.com');
  });
});
