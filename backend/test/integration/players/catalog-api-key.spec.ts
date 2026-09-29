import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { createHash } from 'node:crypto';
import { Equipo } from '../../../src/players/domain/equipo';
import { Jugador } from '../../../src/players/domain/jugador';
import { Liga } from '../../../src/players/domain/liga';
import { CatalogoBase } from '../../../src/players/players.repository';
import {
  createPlayersIntegrationApp,
  PlayersIntegrationApp,
} from './players-integration-app';
import { CATALOG_REFRESH_TEST_API_KEY } from '../helpers/integration-app';

function catalogoValido(): CatalogoBase {
  const liga = Liga.crear({
    id: '3f1f8e5f-e2b9-4f4a-9d25-06c248d78e5b',
    proveedorId: 2021,
    codigo: 'PL',
    nombre: 'Premier League',
  });
  const equipo = Equipo.crear({
    id: 'd21b7e37-50a7-4da6-bfcb-4f4ecb7b7b99',
    proveedorId: 65,
    ligaId: liga.id,
    nombre: 'Manchester City FC',
  });
  const jugador = Jugador.crear({
    id: '8f4cf5a8-5b15-4d07-8f89-ecbdeec1f0fc',
    proveedorId: 44,
    equipoId: equipo.id,
    nombre: 'Cristiano Ronaldo',
  });
  return { ligas: [liga], equipos: [equipo], jugadores: [jugador] };
}

async function autenticar(app: ReturnType<PlayersIntegrationApp['app']['getHttpServer']>, correo: string) {
  await request(app)
    .post('/auth/register')
    .send({ correo, password: 'secret123' })
    .expect(201);
  const login = await request(app)
    .post('/auth/login')
    .send({ correo, password: 'secret123' })
    .expect(200);
  return login.body.accessToken as string;
}

function captureOutput(): { output: string[]; restore: () => void } {
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

function expectNoCredentialLeak(
  output: string,
  apiKey: string,
  jwt?: string,
): void {
  const forbidden = [
    apiKey,
    apiKey.slice(0, 8),
    apiKey.slice(-8),
    String(Buffer.byteLength(apiKey, 'utf8')),
    createHash('sha256').update(apiKey).digest('hex'),
    'CATALOG_REFRESH_API_KEY',
  ];
  if (jwt) {
    forbidden.push(jwt, jwt.slice(0, 8), jwt.slice(-8), String(jwt.length));
  }
  for (const value of forbidden) expect(output).not.toContain(value);
}

function expiredJwt(): string {
  return new JwtService().sign(
    { sub: 'expired-user', correo: 'expired@example.com' },
    { secret: 'test-only-secret-for-jest', expiresIn: -1, algorithm: 'HS256' },
  );
}

function disallowedAlgorithmJwt(): string {
  return new JwtService().sign(
    { sub: 'algorithm-user', correo: 'algorithm@example.com' },
    { secret: 'test-only-secret-for-jest', expiresIn: '15m', algorithm: 'HS512' },
  );
}

describe('POST /catalog/refresh con doble credencial', () => {
  let integration: PlayersIntegrationApp;
  let userNumber = 0;

  beforeAll(async () => {
    integration = await createPlayersIntegrationApp(
      { obtenerCatalogo: jest.fn() },
      { mode: 'strict' },
    );
  });

  beforeEach(async () => {
    await integration.resetData();
    integration.source.obtenerCatalogo.mockReset().mockResolvedValue(catalogoValido());
    integration.estadisticasJugador.actualizarEstadisticasLiga
      .mockReset()
      .mockResolvedValue({
        estado: 'completo',
        procesados: 1,
        exitosos: 1,
        parciales: 0,
        fallidos: 0,
      });
  });

  afterAll(async () => integration?.close());

  it('ejecuta la actualización con JWT válido y API key válida', async () => {
    const app = integration.app.getHttpServer();
    const token = await autenticar(app, `catalog-api-key-valid-${userNumber++}@example.com`);

    const response = await request(app)
      .post('/catalog/refresh?ligaCodigo=PL')
      .set('Authorization', `Bearer ${token}`)
      .set('X-API-Key', integration.catalogRefreshApiKey)
      .expect(200);

    expect(response.body).toMatchObject({
      ligas: 1,
      equipos: 1,
      jugadores: 1,
      estadisticas: { estado: 'completo', procesados: 1, exitosos: 1, parciales: 0, fallidos: 0 },
    });
    expect(integration.source.obtenerCatalogo).toHaveBeenCalledTimes(1);
    expect(integration.estadisticasJugador.actualizarEstadisticasLiga).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['API key ausente', 'valid', undefined],
    ['API key vacía', 'valid', ''],
    ['API key solo espacios', 'valid', ' '.repeat(32)],
    ['API key con espacios laterales', 'valid', ` ${CATALOG_REFRESH_TEST_API_KEY} `],
    ['API key inválida de igual longitud', 'valid', `x${CATALOG_REFRESH_TEST_API_KEY.slice(1)}`],
    ['API key inválida de longitud distinta', 'valid', 'short'],
    ['JWT ausente', 'missing-jwt', undefined],
    ['JWT malformado', 'malformed-jwt', undefined],
    ['JWT alterado', 'altered-jwt', undefined],
    ['JWT vencido', 'expired-jwt', undefined],
    ['JWT con algoritmo no permitido', 'disallowed-algorithm', undefined],
  ] as const)('rechaza %s con HTTP 401 y no ejecuta la actualización', async (_name, jwtCase, apiKey) => {
    const app = integration.app.getHttpServer();
    const token = await autenticar(app, `catalog-api-key-invalid-${userNumber++}@example.com`);
    const jwt =
      jwtCase === 'missing-jwt'
        ? undefined
        : jwtCase === 'malformed-jwt'
          ? 'malformed-jwt'
          : jwtCase === 'altered-jwt'
            ? `${token.slice(0, -1)}${token.endsWith('a') ? 'b' : 'a'}`
            : jwtCase === 'expired-jwt'
              ? expiredJwt()
              : jwtCase === 'disallowed-algorithm'
                ? disallowedAlgorithmJwt()
                : token;
    const receivedApiKey = jwtCase === 'valid' ? apiKey : integration.catalogRefreshApiKey;
    const captured = captureOutput();

    try {
      const http = request(app).post('/catalog/refresh?ligaCodigo=PL');
      if (jwt) http.set('Authorization', `Bearer ${jwt}`);
      if (receivedApiKey !== undefined) http.set('X-API-Key', receivedApiKey);
      const response = await http.expect(401);

      expect(response.body.statusCode).toBe(401);
      expect(response.body.message).toBe('Autenticación requerida o credenciales inválidas.');
      expect(integration.source.obtenerCatalogo).not.toHaveBeenCalled();
      expect(integration.estadisticasJugador.actualizarEstadisticasLiga).not.toHaveBeenCalled();
      expectNoCredentialLeak(
        `${response.text}\n${captured.output.join('\n')}`,
        receivedApiKey ?? integration.catalogRefreshApiKey,
        jwt,
      );
    } finally {
      captured.restore();
    }
  });
});
