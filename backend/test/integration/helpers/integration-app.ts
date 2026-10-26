import './load-env';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../../../src/app.module';
import { configureApp } from '../../../src/configure-app';
import { CreateUsuarios1710000000000 } from '../../../migrations/1710000000000-CreateUsuarios';
import { CreateCatalogoJugadores1727000000000 } from '../../../migrations/1727000000000-CreateCatalogoJugadores';
import { CreateEstadisticasJugadores1790275835000 } from '../../../migrations/1790275835000-CreateEstadisticasJugadores';
import { RenameEntradasAndAllowPerGameStats1790275836000 } from '../../../migrations/1790275836000-RenameEntradasAndAllowPerGameStats';
import { AddUserRoles1790275837000 } from '../../../migrations/1790275837000-AddUserRoles';
import { CreateHistorialCotizacion1790275838000 } from '../../../migrations/1790275838000-CreateHistorialCotizacion';
import { CreateCotizacionRecalculos1790275839000 } from '../../../migrations/1790275839000-CreateCotizacionRecalculos';
import { CreateCotizacionVigente1790275840000 } from '../../../migrations/1790275840000-CreateCotizacionVigente';
import { CurrentQuotesPerStrategy1790275841000 } from '../../../migrations/1790275841000-CurrentQuotesPerStrategy';
import { UserEntity } from '../../../src/users/persistence/user.entity';
import { EquipoEntity } from '../../../src/players/persistence/equipo.entity';
import { EstadisticasJugadorEntity } from '../../../src/players/persistence/estadisticas-jugador.entity';
import { JugadorEntity } from '../../../src/players/persistence/jugador.entity';
import { LigaEntity } from '../../../src/players/persistence/liga.entity';
import { HistorialCotizacionEntity } from '../../../src/players/persistence/historial-cotizacion.entity';
import { VersionEstrategiaCotizacionEntity } from '../../../src/players/persistence/version-estrategia-cotizacion.entity';
import { RecalculoCotizacionEntity } from '../../../src/players/persistence/recalculo-cotizacion.entity';
import { RecalculoCotizacionActivoEntity } from '../../../src/players/persistence/recalculo-cotizacion-activo.entity';
import { CotizacionVigenteEntity } from '../../../src/players/persistence/cotizacion-vigente.entity';

export interface IntegrationApp {
  app: INestApplication;
  resetData(): Promise<void>;
  close(): Promise<void>;
}

export const CATALOG_REFRESH_TEST_API_KEY =
  'catalog-refresh-test-fixture-key-2026-09-29-abcdefghijklmnopqrstuvwxyz';

export async function createIntegrationApp(): Promise<IntegrationApp> {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousDatabaseUrl = process.env.DATABASE_URL;
  const previousCatalogRefreshApiKey = process.env.CATALOG_REFRESH_API_KEY;
  const previousSuperadminEmail = process.env.SUPERADMIN_EMAIL;
  const previousSuperadminPassword = process.env.SUPERADMIN_PASSWORD;
  const configuredDatabaseUrl = process.env.DATABASE_URL;
  if (!configuredDatabaseUrl) {
    throw new Error(
      'DATABASE_URL debe apuntar al PostgreSQL de docker compose para ejecutar integraciones.',
    );
  }

  const databaseUrl = testDatabaseUrl(configuredDatabaseUrl);
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = databaseUrl;
  process.env.CATALOG_REFRESH_API_KEY = CATALOG_REFRESH_TEST_API_KEY;
  delete process.env.SUPERADMIN_EMAIL;
  delete process.env.SUPERADMIN_PASSWORD;

  let testDataSource: DataSource | undefined;
  try {
    await ensureDatabaseExists(databaseUrl);
    testDataSource = new DataSource({
      type: 'postgres',
      url: databaseUrl,
      entities: [
        UserEntity,
        LigaEntity,
        EquipoEntity,
        JugadorEntity,
        EstadisticasJugadorEntity,
        HistorialCotizacionEntity,
        VersionEstrategiaCotizacionEntity,
        RecalculoCotizacionEntity,
        RecalculoCotizacionActivoEntity,
        CotizacionVigenteEntity,
      ],
      migrations: [
        CreateUsuarios1710000000000,
        CreateCatalogoJugadores1727000000000,
        CreateEstadisticasJugadores1790275835000,
        RenameEntradasAndAllowPerGameStats1790275836000,
        AddUserRoles1790275837000,
        CreateHistorialCotizacion1790275838000,
        CreateCotizacionRecalculos1790275839000,
        CreateCotizacionVigente1790275840000,
        CurrentQuotesPerStrategy1790275841000,
      ],
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
    await app.init();

    return {
      app,
      async resetData() {
        if (testDataSource?.isInitialized)
          await testDataSource.query('TRUNCATE TABLE usuarios');
      },
      async close() {
        try {
          await app.close();
        } finally {
          try {
            if (testDataSource?.isInitialized) await testDataSource.destroy();
          } finally {
            restoreEnvironment(previousNodeEnv, previousDatabaseUrl);
            restoreCatalogRefreshApiKey(previousCatalogRefreshApiKey);
            restoreOptionalEnvironment(
              'SUPERADMIN_EMAIL',
              previousSuperadminEmail,
            );
            restoreOptionalEnvironment(
              'SUPERADMIN_PASSWORD',
              previousSuperadminPassword,
            );
          }
        }
      },
    };
  } catch (error) {
    if (testDataSource?.isInitialized) await testDataSource.destroy();
    restoreEnvironment(previousNodeEnv, previousDatabaseUrl);
    restoreCatalogRefreshApiKey(previousCatalogRefreshApiKey);
    restoreOptionalEnvironment('SUPERADMIN_EMAIL', previousSuperadminEmail);
    restoreOptionalEnvironment(
      'SUPERADMIN_PASSWORD',
      previousSuperadminPassword,
    );
    throw error;
  }
}

function restoreCatalogRefreshApiKey(value: string | undefined): void {
  if (value === undefined) delete process.env.CATALOG_REFRESH_API_KEY;
  else process.env.CATALOG_REFRESH_API_KEY = value;
}

function restoreOptionalEnvironment(
  key: 'SUPERADMIN_EMAIL' | 'SUPERADMIN_PASSWORD',
  value: string | undefined,
): void {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

async function ensureDatabaseExists(databaseUrl: string): Promise<void> {
  const database = new URL(databaseUrl);
  const databaseName = decodeURIComponent(database.pathname.slice(1));
  const admin = new URL(databaseUrl);
  admin.pathname = '/postgres';
  const adminDataSource = new DataSource({
    type: 'postgres',
    url: admin.toString(),
  });
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
  const worker = (process.env.JEST_WORKER_ID ?? String(process.pid)).replace(
    /[^a-zA-Z0-9_]/g,
    '_',
  );
  const testName = `${testBaseName}_${worker}`;
  database.pathname = `/${testName}`;
  return database.toString();
}

function restoreEnvironment(
  nodeEnv: string | undefined,
  databaseUrl: string | undefined,
): void {
  if (nodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = nodeEnv;
  if (databaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = databaseUrl;
}
