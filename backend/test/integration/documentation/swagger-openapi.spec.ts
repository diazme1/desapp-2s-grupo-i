import request from 'supertest';
import {
  CATALOG_REFRESH_TEST_API_KEY,
  createIntegrationApp,
  IntegrationApp,
} from '../helpers/integration-app';

describe('contrato Swagger/OpenAPI del refresh', () => {
  let integration: IntegrationApp;

  beforeAll(async () => {
    integration = await createIntegrationApp();
  });

  afterAll(async () => integration?.close());

  it('publica ambos esquemas y un único requisito AND en /docs-json', async () => {
    const response = await request(integration.app.getHttpServer())
      .get('/docs-json')
      .expect(200);
    const document = response.body as {
      components: { securitySchemes: Record<string, unknown> };
      paths: Record<
        string,
        {
          post?: {
            security?: unknown[];
            parameters?: unknown[];
            responses?: Record<string, unknown>;
          };
        }
      >;
    };

    expect(document.components.securitySchemes.catalogRefreshApiKey).toEqual({
      type: 'apiKey',
      in: 'header',
      name: 'X-API-Key',
    });
    expect(document.components.securitySchemes.bearerAuth).toEqual(
      expect.objectContaining({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      }),
    );
    expect(document.paths['/catalog/refresh'].post?.security).toEqual([
      { bearerAuth: [], catalogRefreshApiKey: [] },
    ]);
    expect(document.paths['/catalog/refresh'].post?.responses).toEqual(
      expect.objectContaining({
        '200': expect.anything(),
        '401': expect.anything(),
        '422': expect.anything(),
        '503': expect.anything(),
      }),
    );
    const sell = document.paths['/orders/sell'].post;
    expect(sell?.security).toEqual([{ bearerAuth: [] }]);
    expect(sell?.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Idempotency-Key',
          in: 'header',
          required: true,
        }),
      ]),
    );
    expect(sell?.responses).toEqual(
      expect.objectContaining({
        '201': expect.anything(),
        '401': expect.anything(),
        '403': expect.anything(),
        '404': expect.anything(),
        '409': expect.anything(),
        '422': expect.anything(),
      }),
    );
    expect(JSON.stringify(document)).not.toContain(
      CATALOG_REFRESH_TEST_API_KEY,
    );
  });
});
