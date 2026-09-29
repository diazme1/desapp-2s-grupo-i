import { validateEnvironment } from '../../../src/config/environment';
import { matchesCatalogRefreshApiKey } from '../../../src/auth/catalog-refresh-api-key';

const validDatabaseConfig = {
  DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/football_market_test',
  JWT_SECRET: 'jwt-secret-for-catalog-refresh-tests-2026',
};
const validApiKey = 'catalog-refresh-configured-key-2026-09-29-abcdefghijklmnopqrstuvwxyz';

function captureConsole(): { output: string[]; restore: () => void } {
  const output: string[] = [];
  const methods: Array<'debug' | 'error' | 'info' | 'log' | 'trace' | 'warn'> = [
    'debug',
    'error',
    'info',
    'log',
    'trace',
    'warn',
  ];
  const spies = methods.map((method) =>
    jest.spyOn(console, method).mockImplementation((...args: unknown[]) => {
      output.push(args.map(String).join(' '));
    }),
  );
  return { output, restore: () => spies.forEach((spy) => spy.mockRestore()) };
}

function expectSafeOutput(output: string, secret: string): void {
  if (secret.length > 0) {
    expect(output).not.toContain(secret);
    expect(output).not.toContain(secret.slice(0, 6));
    expect(output).not.toContain(String(Buffer.byteLength(secret, 'utf8')));
  }
  expect(output).not.toContain('hash');
  expect(output).not.toContain('prefijo');
  expect(output).not.toContain('fragmento');
}

describe('CATALOG_REFRESH_API_KEY en la configuración', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  });

  it.each([
    ['ausente', undefined],
    ['vacía', ''],
    ['solo espacios', ' '.repeat(32)],
    ['con espacios laterales', ` ${validApiKey} `],
    ['menor a 32 bytes UTF-8', 'short'],
    ['change-me', 'change-me'],
    ['changeme', 'changeme'],
    ['your-api-key', 'your-api-key'],
    ['your-secret', 'your-secret'],
    ['secret', 'secret'],
    ['test', 'test'],
  ] as const)('rechaza configuración insegura fuera de test: %s', (_name, value) => {
    process.env.NODE_ENV = 'development';
    const captured = captureConsole();

    try {
      expect(() =>
        validateEnvironment({ ...validDatabaseConfig, CATALOG_REFRESH_API_KEY: value }),
      ).toThrow('CATALOG_REFRESH_API_KEY');
      expectSafeOutput(captured.output.join('\n'), typeof value === 'string' ? value : 'undefined');
    } finally {
      captured.restore();
    }
  });

  it('acepta una cadena válida y la conserva para inyección', () => {
    process.env.NODE_ENV = 'development';

    expect(
      validateEnvironment({ ...validDatabaseConfig, CATALOG_REFRESH_API_KEY: validApiKey })
        .CATALOG_REFRESH_API_KEY,
    ).toBe(validApiKey);
  });

  it('permite omitir el secreto de despliegue en NODE_ENV=test', () => {
    process.env.NODE_ENV = 'test';

    expect(validateEnvironment(validDatabaseConfig).CATALOG_REFRESH_API_KEY).toBeUndefined();
  });

  it('sigue validando una API key explícita en NODE_ENV=test', () => {
    process.env.NODE_ENV = 'test';

    expect(() =>
      validateEnvironment({ ...validDatabaseConfig, CATALOG_REFRESH_API_KEY: 'short' }),
    ).toThrow('CATALOG_REFRESH_API_KEY');
  });

  it('no aplica la lista de placeholders al header recibido', () => {
    expect(matchesCatalogRefreshApiKey('secret', validApiKey)).toBe(false);
    expect(matchesCatalogRefreshApiKey(validApiKey, validApiKey)).toBe(true);
  });
});
