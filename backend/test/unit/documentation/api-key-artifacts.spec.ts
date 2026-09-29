import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repositoryRoot = resolve(__dirname, '../../../../');
const artifactPaths = [
  'docs/postman/players-catalog.postman_collection.json',
  'backend/.env.example',
  'README.md',
  'backend/README.md',
  'specs/008-catalog-refresh-api-key/contracts/openapi.yaml',
  'specs/008-catalog-refresh-api-key/quickstart.md',
];
const testFixture = 'catalog-refresh-test-fixture-key-2026-09-29-abcdefghijklmnopqrstuvwxyz';

function readArtifact(path: string): string {
  return readFileSync(resolve(repositoryRoot, path), 'utf8');
}

describe('artefactos de documentación de API key', () => {
  it('no contienen secretos, fixtures ni valores derivados', () => {
    for (const path of artifactPaths) {
      const content = readArtifact(path);
      expect(content).not.toContain(testFixture);
      expect(content).not.toContain('eyJhbGci');
      expect(content).not.toMatch(/catalog-refresh-api-key-[a-z0-9]{8,}/i);
      expect(content).not.toMatch(/^[ \t]*CATALOG_REFRESH_API_KEY[ \t]*=[ \t]*[^\s`\r\n]+/m);
    }
  });

  it('documenta la variable y la política operativa', () => {
    const envExample = readArtifact('backend/.env.example');
    const readme = `${readArtifact('README.md')}\n${readArtifact('backend/README.md')}`;
    const quickstart = readArtifact('specs/008-catalog-refresh-api-key/quickstart.md');
    const contract = readArtifact('specs/008-catalog-refresh-api-key/contracts/openapi.yaml');

    expect(envExample).toMatch(/^CATALOG_REFRESH_API_KEY=$/m);
    for (const content of [envExample, readme, quickstart]) {
      expect(content).toContain('base64url');
      expect(content).toContain('32 bytes');
      expect(content).toContain('X-API-Key');
    }
    expect(contract).toContain('bearerAuth');
    expect(contract).toContain('catalogRefreshApiKey');
    expect(contract).toContain('X-API-Key');
  });

  it('agrega X-API-Key solo al request de actualización en Postman', () => {
    const collection = JSON.parse(readArtifact('docs/postman/players-catalog.postman_collection.json')) as {
      variable: Array<{ key: string; value: string }>;
      item: Array<{ name: string; request: { header?: Array<{ key: string; value: string }> } }>;
    };
    const variable = collection.variable.find(({ key }) => key === 'catalogRefreshApiKey');
    expect(variable).toEqual({ key: 'catalogRefreshApiKey', value: '', type: 'string' });

    for (const item of collection.item) {
      const apiKeyHeaders = (item.request.header ?? []).filter(({ key }) => key.toLowerCase() === 'x-api-key');
      if (item.name === 'Actualizar catálogo base') {
        expect(apiKeyHeaders).toEqual([{ key: 'X-API-Key', value: '{{catalogRefreshApiKey}}', type: 'text' }]);
      } else {
        expect(apiKeyHeaders).toHaveLength(0);
      }
    }
  });
});
