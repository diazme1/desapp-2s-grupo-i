import { validateEnvironment } from '../../../src/config/environment';
import { User } from '../../../src/users/domain/user';

const validDatabaseConfig = { DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/football_market_test' };

describe('validateEnvironment - autenticación', () => {
  const original = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = original;
  });

  it('rechaza un secreto JWT corto fuera de tests', () => {
    process.env.NODE_ENV = 'development';
    expect(() => validateEnvironment({ ...validDatabaseConfig, JWT_SECRET: 'corto' })).toThrow('JWT_SECRET');
  });

  it('acepta duración JWT válida y aplica 15m por defecto', () => {
    process.env.NODE_ENV = 'test';
    expect(validateEnvironment(validDatabaseConfig).JWT_EXPIRES_IN).toBe('15m');
    expect(validateEnvironment({ ...validDatabaseConfig, JWT_EXPIRES_IN: '2h' }).JWT_EXPIRES_IN).toBe('2h');
  });

  it('rechaza algoritmos JWT no permitidos', () => {
    process.env.NODE_ENV = 'test';
    expect(() => validateEnvironment({ ...validDatabaseConfig, JWT_ALGORITHM: 'none' })).toThrow('JWT_ALGORITHM');
  });

  it('normaliza correo en el modelo de usuario', () => {
    expect(User.create({ correo: '  TEST@Example.COM ', passwordHash: 'hash' }).correo).toBe(
      'test@example.com',
    );
  });
});
