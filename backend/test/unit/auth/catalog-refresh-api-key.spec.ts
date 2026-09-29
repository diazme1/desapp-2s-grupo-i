import * as crypto from 'node:crypto';

jest.mock('node:crypto', () => {
  const actual = jest.requireActual<typeof import('node:crypto')>('node:crypto');
  return {
    ...actual,
    timingSafeEqual: jest.fn(actual.timingSafeEqual),
  };
});

import {
  CATALOG_REFRESH_API_KEY_PLACEHOLDERS,
  MIN_CATALOG_REFRESH_API_KEY_BYTES,
  generateCatalogRefreshApiKey,
  getCatalogRefreshApiKeyConfigurationIssue,
  isCatalogRefreshApiKeyPlaceholder,
  matchesCatalogRefreshApiKey,
} from '../../../src/auth/catalog-refresh-api-key';

describe('política criptográfica de API key para refresh', () => {
  it('genera una representación base64url desde 32 bytes aleatorios', () => {
    const key = generateCatalogRefreshApiKey();

    expect(key).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(Buffer.from(key, 'base64url')).toHaveLength(MIN_CATALOG_REFRESH_API_KEY_BYTES);
    expect(Buffer.byteLength(key, 'utf8')).toBeGreaterThanOrEqual(MIN_CATALOG_REFRESH_API_KEY_BYTES);
  });

  it('reconoce la política de configuración sobre bytes UTF-8', () => {
    expect(getCatalogRefreshApiKeyConfigurationIssue('a'.repeat(31))).toBe('too-short');
    expect(getCatalogRefreshApiKeyConfigurationIssue('a'.repeat(32))).toBeUndefined();
    expect(getCatalogRefreshApiKeyConfigurationIssue('á'.repeat(16))).toBeUndefined();
  });

  it.each([
    ['', 'empty'],
    [' '.repeat(32), 'only-spaces'],
    [` ${'a'.repeat(32)}`, 'lateral-spaces'],
    [`${'a'.repeat(32)} `, 'lateral-spaces'],
    [undefined, 'missing'],
  ] as const)('rechaza configuración insegura (%j)', (value, issue) => {
    expect(getCatalogRefreshApiKeyConfigurationIssue(value)).toBe(issue);
  });

  it.each(CATALOG_REFRESH_API_KEY_PLACEHOLDERS)('reconoce %s como placeholder de configuración', (value) => {
    expect(isCatalogRefreshApiKeyPlaceholder(value)).toBe(true);
    expect(getCatalogRefreshApiKeyConfigurationIssue(value)).toBe('placeholder');
  });

  it('compara una API key válida mediante timingSafeEqual', () => {
    const timingSafeEqual = crypto.timingSafeEqual as jest.MockedFunction<typeof crypto.timingSafeEqual>;
    timingSafeEqual.mockClear();

    expect(matchesCatalogRefreshApiKey('a'.repeat(32), 'a'.repeat(32))).toBe(true);
    expect(timingSafeEqual).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['b'.repeat(32), 'a'.repeat(32)],
    [`${'a'.repeat(31)}b`, `${'a'.repeat(31)}a`],
    ['secret', 'a'.repeat(32)],
    [` ${'a'.repeat(32)}`, 'a'.repeat(32)],
  ])('rechaza una API key inválida sin comparación directa de strings', (candidate, expected) => {
    expect(matchesCatalogRefreshApiKey(candidate, expected)).toBe(false);
  });

  it('rechaza longitudes distintas antes de invocar timingSafeEqual', () => {
    const timingSafeEqual = crypto.timingSafeEqual as jest.MockedFunction<typeof crypto.timingSafeEqual>;
    timingSafeEqual.mockClear();

    expect(matchesCatalogRefreshApiKey('corta', 'a'.repeat(32))).toBe(false);
    expect(timingSafeEqual).not.toHaveBeenCalled();
  });

  it('no aplica placeholders al valor recibido por HTTP', () => {
    expect(matchesCatalogRefreshApiKey('secret', 'a'.repeat(32))).toBe(false);
    expect(matchesCatalogRefreshApiKey('change-me', 'a'.repeat(32))).toBe(false);
  });
});
