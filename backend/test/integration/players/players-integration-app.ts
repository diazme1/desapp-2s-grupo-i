import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GenericContainer, Wait } from 'testcontainers';
import { DataSource } from 'typeorm';
import '../helpers/load-env';
import { AppModule } from '../../../src/app.module';
import { configureApp } from '../../../src/configure-app';
import {
  FOOTBALL_DATA_ADAPTER,
  FootballDataPort,
} from '../../../src/players/adapters/football-data/football-data.adapter';
import { EquipoEntity } from '../../../src/players/persistence/equipo.entity';
import { JugadorEntity } from '../../../src/players/persistence/jugador.entity';
import { LigaEntity } from '../../../src/players/persistence/liga.entity';
import { UserEntity } from '../../../src/users/persistence/user.entity';
import { CreateCatalogoJugadores1727000000000 } from '../../../migrations/1727000000000-CreateCatalogoJugadores';
import { CreateEstadisticasJugadores1790275835000 } from '../../../migrations/1790275835000-CreateEstadisticasJugadores';
import { RenameEntradasAndAllowPerGameStats1790275836000 } from '../../../migrations/1790275836000-RenameEntradasAndAllowPerGameStats';
import { CreateUsuarios1710000000000 } from '../../../migrations/1710000000000-CreateUsuarios';
import { AddUserRoles1790275837000 } from '../../../migrations/1790275837000-AddUserRoles';
import { CreateHistorialCotizacion1790275838000 } from '../../../migrations/1790275838000-CreateHistorialCotizacion';
import { EstadisticasJugadorService } from '../../../src/players/estadisticas-jugador.service';
import { EstadisticasJugadorEntity } from '../../../src/players/persistence/estadisticas-jugador.entity';
import { HistorialCotizacionEntity } from '../../../src/players/persistence/historial-cotizacion.entity';
import { CATALOG_REFRESH_TEST_API_KEY } from '../helpers/integration-app';

export type PlayersIntegrationMode = 'legacy' | 'strict';

const POSTGRES_IMAGE = 'postgres:16-alpine';
const POSTGRES_PORT = 5432;

export interface PlayersIntegrationApp {
  app: INestApplication;
  dataSource: DataSource;
  source: jest.Mocked<FootballDataPort>;
  estadisticasJugador: { actualizarEstadisticasLiga: jest.Mock };
  catalogRefreshApiKey: string;
  resetData(): Promise<void>;
  close(): Promise<void>;
}

export async function createPlayersIntegrationApp(
  source: jest.Mocked<FootballDataPort>,
  options: { mode?: PlayersIntegrationMode } = {},
): Promise<PlayersIntegrationApp> {
  const mode = options.mode ?? 'legacy';
  const previousCatalogRefreshApiKey = process.env.CATALOG_REFRESH_API_KEY;
  const previousSuperadminEmail = process.env.SUPERADMIN_EMAIL;
  const previousSuperadminPassword = process.env.SUPERADMIN_PASSWORD;
  const container = await new GenericContainer(POSTGRES_IMAGE)
    .withEnvironment({
      POSTGRES_DB: 'football_market',
      POSTGRES_USER: 'postgres',
      POSTGRES_PASSWORD: 'postgres',
    })
    .withExposedPorts(POSTGRES_PORT)
    .withWaitStrategy(
      Wait.forLogMessage(/database system is ready to accept connections/, 2),
    )
    .withStartupTimeout(120_000)
    .start();
  process.env.CATALOG_REFRESH_API_KEY = CATALOG_REFRESH_TEST_API_KEY;
  delete process.env.SUPERADMIN_EMAIL;
  delete process.env.SUPERADMIN_PASSWORD;
  const databaseUrl = `postgres://postgres:postgres@${container.getHost()}:${container.getMappedPort(POSTGRES_PORT)}/football_market`;
  const dataSource = new DataSource({
    type: 'postgres',
    url: databaseUrl,
    entities: [
      UserEntity,
      LigaEntity,
      EquipoEntity,
      JugadorEntity,
      EstadisticasJugadorEntity,
      HistorialCotizacionEntity,
    ],
    migrations: [
      CreateUsuarios1710000000000,
      CreateCatalogoJugadores1727000000000,
      CreateEstadisticasJugadores1790275835000,
      RenameEntradasAndAllowPerGameStats1790275836000,
      AddUserRoles1790275837000,
      CreateHistorialCotizacion1790275838000,
    ],
    dropSchema: true,
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    await dataSource.runMigrations();
    const previousDatabaseUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = databaseUrl;
    const estadisticasJugador = {
      actualizarEstadisticasLiga: jest
        .fn()
        .mockImplementation(async (_liga: string, jugadores: unknown[]) => ({
          estado: 'completo',
          procesados: jugadores.length,
          exitosos: jugadores.length,
          parciales: 0,
          fallidos: 0,
        })),
    };
    const module = await Test.createTestingModule({
      imports: [AppModule.register('.env.no-test')],
    })
      .overrideProvider(FOOTBALL_DATA_ADAPTER)
      .useValue(source)
      .overrideProvider(EstadisticasJugadorService)
      .useValue(estadisticasJugador)
      .compile();
    const app = module.createNestApplication();
    configureApp(app);
    if (mode === 'legacy') {
      app.use(
        (
          request: import('express').Request,
          _response: import('express').Response,
          next: import('express').NextFunction,
        ) => {
          if (
            request.method === 'POST' &&
            request.path === '/catalog/refresh' &&
            request.headers['x-api-key'] === undefined
          ) {
            request.headers['x-api-key'] = CATALOG_REFRESH_TEST_API_KEY;
          }
          next();
        },
      );
    }
    await app.init();
    return {
      app,
      dataSource,
      source,
      estadisticasJugador,
      catalogRefreshApiKey: CATALOG_REFRESH_TEST_API_KEY,
      async resetData() {
        await dataSource.query(
          'TRUNCATE TABLE historial_cotizacion, estadisticas_jugadores, jugadores, equipos, ligas, usuarios',
        );
      },
      async close() {
        try {
          await app.close();
        } finally {
          if (dataSource.isInitialized) await dataSource.destroy();
          await container.stop();
          if (previousDatabaseUrl === undefined)
            delete process.env.DATABASE_URL;
          else process.env.DATABASE_URL = previousDatabaseUrl;
          if (previousCatalogRefreshApiKey === undefined)
            delete process.env.CATALOG_REFRESH_API_KEY;
          else
            process.env.CATALOG_REFRESH_API_KEY = previousCatalogRefreshApiKey;
          restoreOptionalEnvironment(
            'SUPERADMIN_EMAIL',
            previousSuperadminEmail,
          );
          restoreOptionalEnvironment(
            'SUPERADMIN_PASSWORD',
            previousSuperadminPassword,
          );
        }
      },
    };
  } catch (error) {
    if (dataSource.isInitialized) await dataSource.destroy();
    await container.stop();
    if (previousCatalogRefreshApiKey === undefined)
      delete process.env.CATALOG_REFRESH_API_KEY;
    else process.env.CATALOG_REFRESH_API_KEY = previousCatalogRefreshApiKey;
    restoreOptionalEnvironment('SUPERADMIN_EMAIL', previousSuperadminEmail);
    restoreOptionalEnvironment(
      'SUPERADMIN_PASSWORD',
      previousSuperadminPassword,
    );
    throw error;
  }
}

function restoreOptionalEnvironment(
  key: 'SUPERADMIN_EMAIL' | 'SUPERADMIN_PASSWORD',
  value: string | undefined,
): void {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
