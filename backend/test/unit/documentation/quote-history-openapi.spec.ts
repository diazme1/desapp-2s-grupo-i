import request from 'supertest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { configureApp } from '../../../src/configure-app';
import { ActualizarCatalogoService } from '../../../src/players/actualizar-catalogo.service';
import { CatalogoJugadoresService } from '../../../src/players/catalogo-jugadores.service';
import { PlayersController } from '../../../src/players/players.controller';
import { HistorialCotizacionService } from '../../../src/quotes/historial-cotizacion.service';
import { JwtAuthGuard } from '../../../src/auth/guards/jwt-auth.guard';
import {
  CATALOG_REFRESH_API_KEY_CONFIG,
  CatalogRefreshApiKeyGuard,
} from '../../../src/auth/guards/catalog-refresh-api-key.guard';
import { JwtTokenService } from '../../../src/auth/strategies/jwt-token.service';

describe('documentación OpenAPI del historial de cotizaciones', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [PlayersController],
      providers: [
        { provide: CatalogoJugadoresService, useValue: {} },
        { provide: ActualizarCatalogoService, useValue: {} },
        { provide: HistorialCotizacionService, useValue: {} },
        { provide: JwtTokenService, useValue: { verify: jest.fn() } },
        { provide: CATALOG_REFRESH_API_KEY_CONFIG, useValue: 'test-api-key' },
        { provide: JwtAuthGuard, useValue: { canActivate: () => true } },
        {
          provide: CatalogRefreshApiKeyGuard,
          useValue: { canActivate: () => true },
        },
      ],
    }).compile();

    app = module.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => app?.close());

  it('publica parámetros, respuesta y errores del endpoint sin depender de PostgreSQL', async () => {
    const response = await request(app.getHttpServer()).get('/docs-json').expect(200);
    const document = response.body as {
      paths: Record<
        string,
        {
          get?: {
            parameters?: Array<{ name: string; in: string }>;
            responses?: Record<string, unknown>;
          };
        }
      >;
    };
    const endpoint = document.paths['/players/{id}/quotes']?.get;

    expect(endpoint).toBeDefined();
    expect(endpoint?.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'id', in: 'path' }),
        expect.objectContaining({ name: 'page', in: 'query' }),
        expect.objectContaining({ name: 'limit', in: 'query' }),
      ]),
    );
    expect(endpoint?.responses).toEqual(
      expect.objectContaining({
        '200': expect.anything(),
        '404': expect.anything(),
        '422': expect.anything(),
      }),
    );
    expect(JSON.stringify(document.components?.schemas)).toContain(
      'CotizacionHistorialItemResponseDto',
    );
  });
});
