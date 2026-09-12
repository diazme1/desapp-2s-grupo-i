import { BcryptPasswordHasher } from '../../../src/auth/strategies/password-hasher';

describe('BcryptPasswordHasher', () => {
  it('guarda un hash distinto del password y compara correctamente', async () => {
    const hasher = new BcryptPasswordHasher();
    const hash = await hasher.hash('secreto123');

    expect(hash).not.toBe('secreto123');
    await expect(hasher.compare('secreto123', hash)).resolves.toBe(true);
    await expect(hasher.compare('otra-clave', hash)).resolves.toBe(false);
  });
});
