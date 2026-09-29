import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { CatalogRefreshApiKeyGuard } from '../../../src/auth/guards/catalog-refresh-api-key.guard';

const expectedApiKey = 'catalog-refresh-guard-fixture-key-2026-09-29-abcdefghijklmnopqrstuvwxyz';

function contextWithHeader(value: string | readonly string[] | undefined): ExecutionContext {
  const headers = value === undefined ? {} : { 'x-api-key': value };
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  } as ExecutionContext;
}

function expectUnauthorized(guard: CatalogRefreshApiKeyGuard, value: string | readonly string[] | undefined): void {
  try {
    guard.canActivate(contextWithHeader(value));
    fail('La request debía ser rechazada.');
  } catch (error) {
    expect(error).toBeInstanceOf(UnauthorizedException);
    const response = error instanceof UnauthorizedException ? JSON.stringify(error.getResponse()) : String(error);
    const forbidden = [
      expectedApiKey,
      expectedApiKey.slice(0, 8),
      expectedApiKey.slice(-8),
      String(Buffer.byteLength(expectedApiKey, 'utf8')),
      createHash('sha256').update(expectedApiKey).digest('hex'),
      'CATALOG_REFRESH_API_KEY',
    ];
    for (const valueToHide of forbidden) expect(response).not.toContain(valueToHide);
  }
}

describe('CatalogRefreshApiKeyGuard', () => {
  it('autoriza una API key válida recibida por header', () => {
    const guard = new CatalogRefreshApiKeyGuard(expectedApiKey);

    expect(guard.canActivate(contextWithHeader(expectedApiKey))).toBe(true);
  });

  it.each([
    ['ausente', undefined],
    ['vacía', ''],
    ['solo espacios', ' '.repeat(32)],
    ['con espacios laterales', ` ${expectedApiKey} `],
    ['repetida', [expectedApiKey, expectedApiKey]],
    ['inválida de igual longitud', `x${expectedApiKey.slice(1)}`],
    ['inválida de longitud distinta', 'short'],
  ] as const)('rechaza API key %s con 401 genérico', (_name, value) => {
    expectUnauthorized(new CatalogRefreshApiKeyGuard(expectedApiKey), value);
  });

  it('usa exclusivamente el secreto inyectado y no process.env', () => {
    const previous = process.env.CATALOG_REFRESH_API_KEY;
    process.env.CATALOG_REFRESH_API_KEY = 'otra-clave-no-utilizada';

    try {
      const guard = new CatalogRefreshApiKeyGuard(expectedApiKey);
      expect(guard.canActivate(contextWithHeader(expectedApiKey))).toBe(true);
    } finally {
      if (previous === undefined) delete process.env.CATALOG_REFRESH_API_KEY;
      else process.env.CATALOG_REFRESH_API_KEY = previous;
    }
  });
});
