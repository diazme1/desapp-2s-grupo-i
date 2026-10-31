import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard } from '../../../src/auth/guards/jwt-auth.guard';
import { PortfolioController } from '../../../src/portfolio/portfolio.controller';
import { PortfolioService } from '../../../src/portfolio/portfolio.service';

describe('documentación OpenAPI del portfolio', () => {
  it('declara JwtAuthGuard en el controller', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, PortfolioController)).toContain(
      JwtAuthGuard,
    );
  });

  it('publica el GET autenticado con parámetro, schemas y respuestas', async () => {
    const module = await Test.createTestingModule({
      controllers: [PortfolioController],
      providers: [{ provide: PortfolioService, useValue: {} }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();
    const app = module.createNestApplication();
    await app.init();

    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('test')
        .setVersion('1')
        .addBearerAuth({ type: 'http', scheme: 'bearer' }, 'bearerAuth')
        .build(),
    );
    const endpoint = document.paths['/users/{id}/portfolio']?.get;

    expect(endpoint).toBeDefined();
    expect(endpoint?.security).toEqual([{ bearerAuth: [] }]);
    expect(endpoint?.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'id',
          in: 'path',
          required: true,
          schema: expect.objectContaining({ format: 'uuid' }),
        }),
      ]),
    );
    expect(endpoint?.responses).toEqual(
      expect.objectContaining({
        '200': expect.anything(),
        '401': expect.anything(),
        '403': expect.anything(),
        '404': expect.anything(),
        '409': expect.anything(),
        '422': expect.anything(),
      }),
    );

    await app.close();
  });
});
