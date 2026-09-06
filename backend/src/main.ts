import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { configureApp } from './configure-app';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule.register(), {
    abortOnError: false,
    logger: false,
  });
  try {
    configureApp(app);
    app.enableShutdownHooks();
    const port = app.get(ConfigService).getOrThrow<number>('PORT');
    await app.listen(port);
    console.log(`Servidor disponible: http://localhost:${port}`);
    console.log(`Swagger: http://localhost:${port}/docs`);
  } catch (error) {
    await app.close();
    throw error;
  }
}

bootstrap().catch((error: unknown) => {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? error.code
      : undefined;
  const message =
    code === 'EADDRINUSE'
      ? 'El puerto está ocupado. Elegí otro valor de PORT.'
      : error instanceof Error && error.message.startsWith('PORT ')
        ? error.message
        : 'No se pudo iniciar el servidor. Revisá la configuración local.';
  console.error(message);
  process.exitCode = 1;
});
