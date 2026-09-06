import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

export function configureApp(app: INestApplication): void {
  app.useGlobalFilters(new HttpExceptionFilter());
  const config = new DocumentBuilder()
    .setTitle('API base del TP')
    .setDescription('Comprobación de salud del backend.')
    .setVersion('1.0.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  document.openapi = '3.0.3';
  document.security = [];
  const schema = document.components?.schemas?.HealthResponseDto;
  if (schema && !('$ref' in schema)) schema.additionalProperties = false;
  SwaggerModule.setup('docs', app, document, { jsonDocumentUrl: 'docs-json' });
}
