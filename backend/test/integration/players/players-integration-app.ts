import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GenericContainer, Wait } from 'testcontainers';
import { DataSource } from 'typeorm';
import { AppModule } from '../../../src/app.module';
import { configureApp } from '../../../src/configure-app';
import { FOOTBALL_DATA_ADAPTER, FootballDataPort } from '../../../src/players/adapters/football-data/football-data.adapter';
import { EquipoEntity } from '../../../src/players/persistence/equipo.entity';
import { JugadorEntity } from '../../../src/players/persistence/jugador.entity';
import { LigaEntity } from '../../../src/players/persistence/liga.entity';
import { UserEntity } from '../../../src/users/persistence/user.entity';
import { CreateCatalogoJugadores1727000000000 } from '../../../migrations/1727000000000-CreateCatalogoJugadores';
import { CreateEstadisticasJugadores1790275835000 } from '../../../migrations/1790275835000-CreateEstadisticasJugadores';
import { RenameEntradasAndAllowPerGameStats1790275836000 } from '../../../migrations/1790275836000-RenameEntradasAndAllowPerGameStats';
import { CreateUsuarios1710000000000 } from '../../../migrations/1710000000000-CreateUsuarios';
import { EstadisticasJugadorService } from '../../../src/players/estadisticas-jugador.service';
import { EstadisticasJugadorEntity } from '../../../src/players/persistence/estadisticas-jugador.entity';

const POSTGRES_IMAGE = 'postgres:16-alpine';
const POSTGRES_PORT = 5432;

export interface PlayersIntegrationApp {
  app: INestApplication;
  dataSource: DataSource;
  source: jest.Mocked<FootballDataPort>;
  estadisticasJugador: { actualizarEstadisticasLiga: jest.Mock };
  resetData(): Promise<void>;
  close(): Promise<void>;
}

export async function createPlayersIntegrationApp(
  source: jest.Mocked<FootballDataPort>,
): Promise<PlayersIntegrationApp> {
  const container = await new GenericContainer(POSTGRES_IMAGE)
    .withEnvironment({
      POSTGRES_DB: 'football_market',
      POSTGRES_USER: 'postgres',
      POSTGRES_PASSWORD: 'postgres',
    })
    .withExposedPorts(POSTGRES_PORT)
    .withWaitStrategy(Wait.forLogMessage(/database system is ready to accept connections/, 2))
    .withStartupTimeout(120_000)
    .start();
  const databaseUrl = `postgres://postgres:postgres@${container.getHost()}:${container.getMappedPort(POSTGRES_PORT)}/football_market`;
  const dataSource = new DataSource({
    type: 'postgres',
    url: databaseUrl,
    entities: [UserEntity, LigaEntity, EquipoEntity, JugadorEntity, EstadisticasJugadorEntity],
    migrations: [
      CreateUsuarios1710000000000,
      CreateCatalogoJugadores1727000000000,
      CreateEstadisticasJugadores1790275835000,
      RenameEntradasAndAllowPerGameStats1790275836000,
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
      actualizarEstadisticasLiga: jest.fn().mockImplementation(async (_liga: string, jugadores: unknown[]) => ({
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
    app.enableShutdownHooks();
    await app.init();
    return {
      app,
      dataSource,
      source,
      estadisticasJugador,
      async resetData() {
        await dataSource.query(
          'TRUNCATE TABLE estadisticas_jugadores, jugadores, equipos, ligas, usuarios',
        );
      },
      async close() {
        try {
          await app.close();
        } finally {
          if (dataSource.isInitialized) await dataSource.destroy();
          await container.stop();
          if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
          else process.env.DATABASE_URL = previousDatabaseUrl;
        }
      },
    };
  } catch (error) {
    if (dataSource.isInitialized) await dataSource.destroy();
    await container.stop();
    throw error;
  }
}
