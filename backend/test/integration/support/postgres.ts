import { GenericContainer, type StartedTestContainer, Wait } from 'testcontainers';
import { DataSource } from 'typeorm';
import { CreateUsuarios1710000000000 } from '../../../migrations/1710000000000-CreateUsuarios';
import { UserEntity } from '../../../src/users/persistence/user.entity';

const POSTGRES_IMAGE = 'postgres:16-alpine';
const POSTGRES_PORT = 5432;

export interface TestDatabase {
  container: StartedTestContainer;
  url: string;
}

export async function startTestDatabase(): Promise<TestDatabase> {
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

  const url = `postgres://postgres:postgres@${container.getHost()}:${container.getMappedPort(POSTGRES_PORT)}/football_market`;
  const dataSource = new DataSource({
    type: 'postgres',
    url,
    entities: [UserEntity],
    migrations: [CreateUsuarios1710000000000],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    await dataSource.runMigrations();
  } catch (error) {
    if (dataSource.isInitialized) await dataSource.destroy();
    await container.stop();
    throw error;
  }

  await dataSource.destroy();
  return { container, url };
}

export async function stopTestDatabase(database: TestDatabase | undefined): Promise<void> {
  if (database) await database.container.stop();
}
