import { validateEnvironment } from '../../src/config/environment';

const validDatabaseConfig = { DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/football_market_test' };

describe('Configuración de PORT', () => {
  it('rechaza una DATABASE_URL ausente', () => {
    expect(() => validateEnvironment({})).toThrow('DATABASE_URL es obligatoria');
  });

  it('usa 3000 cuando PORT está ausente', () => {
    expect(validateEnvironment(validDatabaseConfig).PORT).toBe(3000);
  });
  it.each(['1', '3000', '65535'])('acepta el puerto %s', (port) => {
    expect(validateEnvironment({ ...validDatabaseConfig, PORT: port }).PORT).toBe(Number(port));
  });
  it.each(['', 'texto', '0', '-1', '3.5', '65536', ' 3000 ', '3e3'])('rechaza %j con mensaje en español', (port) => {
    expect(() => validateEnvironment({ ...validDatabaseConfig, PORT: port })).toThrow('PORT debe ser un entero entre 1 y 65535.');
  });
});
