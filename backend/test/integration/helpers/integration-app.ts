import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../../../src/app.module';
import { configureApp } from '../../../src/configure-app';
import { CreateUsuarios1710000000000 } from '../../../migrations/1710000000000-CreateUsuarios';
import { UserEntity } from '../../../src/users/persistence/user.entity';

export interface IntegrationApp {
  app: INestApplication;
  resetData(): Promise<void>;
  close(): Promise<void>;
}

export async function createIntegrationApp(): Promise<IntegrationApp> {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousDatabaseUrl = process.env.DATABASE_URL;
  const configuredDatabaseUrl = process.env.DATABASE_URL;
  if (!configuredDatabaseUrl) {
    throw new Error('DATABASE_URL debe apuntar al PostgreSQL de docker compose para ejecutar integraciones.');
  }

  const databaseUrl = testDatabaseUrl(configuredDatabaseUrl);
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = databaseUrl;

  let testDataSource: DataSource | undefined;
  try {
    await ensureDatabaseExists(databaseUrl);
    testDataSource = new DataSource({
      type: 'postgres',
      url: databaseUrl,
      entities: [UserEntity],
      migrations: [CreateUsuarios1710000000000],
      dropSchema: true,
      synchronize: false,
    });
    await testDataSource.initialize();
    await testDataSource.runMigrations();

    const module = await Test.createTestingModule({
      imports: [AppModule.register('.env.no-test')],
    }).compile();
    const app = module.createNestApplication();
    configureApp(app);
    app.enableShutdownHooks();
    await app.init();

    return {
      app,
      async resetData() {
        if (testDataSource?.isInitialized) await testDataSource.query('TRUNCATE TABLE usuarios');
      },
      async close() {
        try {
          await app.close();
        } finally {
          try {
            if (testDataSource?.isInitialized) await testDataSource.destroy();
          } finally {
            restoreEnvironment(previousNodeEnv, previousDatabaseUrl);
          }
        }
      },
    };
  } catch (error) {
    if (testDataSource?.isInitialized) await testDataSource.destroy();
    restoreEnvironment(previousNodeEnv, previousDatabaseUrl);
    throw error;
  }
}

async function ensureDatabaseExists(databaseUrl: string): Promise<void> {
  const database = new URL(databaseUrl);
  const databaseName = decodeURIComponent(database.pathname.slice(1));
  const admin = new URL(databaseUrl);
  admin.pathname = '/postgres';
  const adminDataSource = new DataSource({ type: 'postgres', url: admin.toString() });
  try {
    await adminDataSource.initialize();
    const identifier = databaseName.replace(/[^a-zA-Z0-9_]/g, '_');
    try {
      await adminDataSource.query(`CREATE DATABASE "${identifier}"`);
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code !== '42P04' && code !== '23505') throw error;
    }
  } finally {
    if (adminDataSource.isInitialized) await adminDataSource.destroy();
  }
}

function testDatabaseUrl(configuredDatabaseUrl: string): string {
  const database = new URL(configuredDatabaseUrl);
  const databaseName = decodeURIComponent(database.pathname.slice(1));
  const normalizedDatabaseName = databaseName.replace(/[^a-zA-Z0-9_]/g, '_');
  const testBaseName = normalizedDatabaseName.endsWith('_test')
    ? normalizedDatabaseName
    : `${normalizedDatabaseName}_test`;
  const worker = (process.env.JEST_WORKER_ID ?? String(process.pid)).replace(/[^a-zA-Z0-9_]/g, '_');
  const testName = `${testBaseName}_${worker}`;
  database.pathname = `/${testName}`;
  return database.toString();
}

function restoreEnvironment(nodeEnv: string | undefined, databaseUrl: string | undefined): void {
  if (nodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = nodeEnv;
  if (databaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = databaseUrl;
}
