import { AuthService } from '../../../src/auth/auth.service';
import { Creditos } from '../../../src/market/domain/creditos';

describe('AuthService.register con saldo inicial', () => {
  it('solicita al puerto existente el saldo inicial exacto sin cambiar el contrato público', async () => {
    const repository = {
      findByEmail: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(async (user) => user),
    } as any;
    const service = new AuthService(
      repository,
      { hash: jest.fn().mockResolvedValue('hash') } as any,
      {} as any,
    );

    const result = await service.register({ correo: 'new@example.com', password: 'secret123' });

    expect(repository.create).toHaveBeenCalledWith(
      expect.anything(),
      { saldoInicial: expect.any(Creditos) },
    );
    expect(repository.create.mock.calls[0][1].saldoInicial.toUnidades()).toBe(100_000n);
    expect(result).not.toHaveProperty('saldoInicial');
  });
});
