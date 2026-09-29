import * as crypto from 'node:crypto';

export const MIN_CATALOG_REFRESH_API_KEY_BYTES = 32;

export const CATALOG_REFRESH_API_KEY_PLACEHOLDERS = [
  'change-me',
  'changeme',
  'your-api-key',
  'your-secret',
  'secret',
  'test',
] as const;

export type CatalogRefreshApiKeyConfigurationIssue =
  | 'missing'
  | 'empty'
  | 'only-spaces'
  | 'lateral-spaces'
  | 'too-short'
  | 'placeholder';

const catalogRefreshApiKeyPlaceholders = new Set<string>(CATALOG_REFRESH_API_KEY_PLACEHOLDERS);

export function generateCatalogRefreshApiKey(): string {
  return crypto.randomBytes(MIN_CATALOG_REFRESH_API_KEY_BYTES).toString('base64url');
}

export function getCatalogRefreshApiKeyConfigurationIssue(
  value: unknown,
): CatalogRefreshApiKeyConfigurationIssue | undefined {
  if (typeof value !== 'string') return 'missing';
  if (value.length === 0) return 'empty';
  if (value.trim().length === 0) return 'only-spaces';
  if (value !== value.trim()) return 'lateral-spaces';
  if (catalogRefreshApiKeyPlaceholders.has(value)) return 'placeholder';
  if (Buffer.byteLength(value, 'utf8') < MIN_CATALOG_REFRESH_API_KEY_BYTES) return 'too-short';
  return undefined;
}

export function isCatalogRefreshApiKeyPlaceholder(value: string): boolean {
  return catalogRefreshApiKeyPlaceholders.has(value);
}

export function matchesCatalogRefreshApiKey(candidate: unknown, expected: unknown): boolean {
  if (typeof candidate !== 'string' || typeof expected !== 'string') return false;

  const candidateBuffer = Buffer.from(candidate, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  if (candidateBuffer.length !== expectedBuffer.length) return false;

  return crypto.timingSafeEqual(candidateBuffer, expectedBuffer);
}
