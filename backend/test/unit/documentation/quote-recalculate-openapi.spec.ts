import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { configureApp } from '../../../src/configure-app';
import { JwtAuthGuard } from '../../../src/auth/guards/jwt-auth.guard';
import { JwtTokenService } from '../../../src/auth/strategies/jwt-token.service';
import { SuperadminGuard } from '../../../src/auth/guards/superadmin.guard';
import { QuotesController } from '../../../src/quotes/quotes.controller';
import { RecalcularCotizacionesService } from '../../../src/quotes/recalcular-cotizaciones.service';
import { RankingController } from '../../../src/quotes/ranking.controller';
import { RankingCotizacionesService } from '../../../src/quotes/ranking-cotizaciones.service';

describe('documentación OpenAPI del recálculo de cotizaciones', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [QuotesController, RankingController],
      providers: [
        { provide: RecalcularCotizacionesService, useValue: { ejecutar: jest.fn() } },
        { provide: RankingCotizacionesService, useValue: { listar: jest.fn() } },
        { provide: JwtTokenService, useValue: { verify: jest.fn() } },
        { provide: JwtAuthGuard, useValue: { canActivate: () => true } },
        { provide: SuperadminGuard, useValue: { canActivate: () => true } },
      ],
    }).compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => app?.close());

  it('publica body, respuesta y restricciones de acceso', async () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('API').setVersion('1').addBearerAuth().build(),
    ) as {
      paths: Record<
        string,
        {
          get?: { parameters?: unknown[]; responses?: Record<string, unknown> };
          post?: { requestBody?: unknown; responses?: Record<string, unknown> };
        }
      >;
      components?: { schemas?: Record<string, { properties?: Record<string, { enum?: string[] }> }> };
    };
    const endpoint = document.paths['/quotes/recalculate']?.post;

    expect(endpoint?.requestBody).toBeDefined();
    expect(endpoint?.responses).toEqual(
      expect.objectContaining({
        '200': expect.anything(),
        '401': expect.anything(),
        '403': expect.anything(),
        '422': expect.anything(),
        '500': expect.anything(),
      }),
    );
    const dto = Object.values(document.components?.schemas ?? {}).find(
      (schema) => schema.properties?.estrategia,
    );
    expect(dto?.properties?.estrategia?.enum).toEqual([
      'ataque_decisivo',
      'creacion_tecnica',
    ]);
    expect(document.paths['/players/ranking']?.get?.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'estrategia', in: 'query' }),
      ]),
    );
  });
});
