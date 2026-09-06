import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AppModule } from '../../src/app.module';
import { HealthController } from '../../src/health/health.controller';

describe('Integración de la aplicación sin persistencia', () => {
  let module: TestingModule | undefined;
  let savedPort: string | undefined;
  let directory: string;

  beforeEach(() => {
    savedPort = process.env.PORT;
    delete process.env.PORT;
    directory = mkdtempSync(join(tmpdir(), 'app-base-'));
  });
  afterEach(async () => {
    await module?.close();
    module = undefined;
    if (savedPort === undefined) delete process.env.PORT;
    else process.env.PORT = savedPort;
    rmSync(directory, { recursive: true, force: true });
  });
  async function compile() {
    return Test.createTestingModule({ imports: [AppModule.register(join(directory, '.env'))] }).compile();
  }
  it('integra Controller, Service y configuración por defecto sin .env', async () => {
    module = await compile();
    expect(module.get(ConfigService).get('PORT')).toBe(3000);
    const controller = module.get(HealthController);
    expect(controller.getHealth()).toEqual({ status: 'ok' });
    expect(controller.getHealth()).toEqual({ status: 'ok' });
  });
  it('lee PORT del archivo de entorno opcional', async () => {
    writeFileSync(join(directory, '.env'), 'PORT=3001\n');
    module = await compile();
    expect(module.get(ConfigService).get('PORT')).toBe(3001);
  });
  it('prioriza el entorno del proceso sobre el archivo', async () => {
    writeFileSync(join(directory, '.env'), 'PORT=3001\n');
    process.env.PORT = '3002';
    module = await compile();
    expect(module.get(ConfigService).get('PORT')).toBe(3002);
  });
  it('rechaza configuración inválida al componer el módulo', async () => {
    process.env.PORT = 'incorrecto';
    await expect(compile()).rejects.toThrow('PORT debe ser un entero entre 1 y 65535.');
  });
});
