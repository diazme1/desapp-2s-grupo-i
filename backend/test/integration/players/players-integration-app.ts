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
import { CreateUsuarios1710000000000 } from '../../../migrations/1710000000000-CreateUsuarios';

const POSTGRES_IMAGE = 'postgres:16-alpine';
const POSTGRES_PORT = 5432;

export interface PlayersIntegrationApp {
  app: INestApplication;
  source: jest.Mocked<FootballDataPort>;
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
    entities: [UserEntity, LigaEntity, EquipoEntity, JugadorEntity],
    migrations: [CreateUsuarios1710000000000, CreateCatalogoJugadores1727000000000],
    dropSchema: true,
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    await dataSource.runMigrations();
    const module = await Test.createTestingModule({
      imports: [AppModule.register('.env.no-test')],
    })
      .overrideProvider(FOOTBALL_DATA_ADAPTER)
      .useValue(source)
      .compile();
    const app = module.createNestApplication();
    configureApp(app);
    app.enableShutdownHooks();
    await app.init();
    return {
      app,
      source,
      async resetData() {
        await dataSource.query('TRUNCATE TABLE jugadores, equipos, ligas, usuarios');
      },
      async close() {
        try {
          await app.close();
        } finally {
          if (dataSource.isInitialized) await dataSource.destroy();
          await container.stop();
        }
      },
    };
  } catch (error) {
    if (dataSource.isInitialized) await dataSource.destroy();
    await container.stop();
    throw error;
  }
}
