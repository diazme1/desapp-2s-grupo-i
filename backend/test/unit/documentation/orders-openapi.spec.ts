import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { OrdersController } from '../../../src/orders/orders.controller';
import { OrdersService } from '../../../src/orders/orders.service';
import { JwtAuthGuard } from '../../../src/auth/guards/jwt-auth.guard';
import { GUARDS_METADATA } from '@nestjs/common/constants';

describe('documentación OpenAPI de órdenes', () => {
  it('declara JwtAuthGuard en el controller de órdenes', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, OrdersController),
    ).toContain(JwtAuthGuard);
  });

  it('publica la compra autenticada, su header y sus respuestas', async () => {
    const builder = Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        { provide: OrdersService, useValue: {} },
      ],
    });
    builder.overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true });
    const module = await builder.compile();
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
    const endpoint = document.paths['/orders/buy']?.post;

    expect(endpoint).toBeDefined();
    expect(endpoint?.security).toEqual([{ bearerAuth: [] }]);
    expect(endpoint?.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Idempotency-Key', in: 'header', required: true }),
      ]),
    );
    expect(endpoint?.responses).toEqual(
      expect.objectContaining({
        '201': expect.anything(),
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
