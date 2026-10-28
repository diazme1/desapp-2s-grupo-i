import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GenericContainer, Wait } from 'testcontainers';
import { DataSource } from 'typeorm';
import '../helpers/load-env';
import { AppModule } from '../../../src/app.module';
import { configureApp } from '../../../src/configure-app';
import { UserEntity } from '../../../src/users/persistence/user.entity';
import { SaldoUsuarioEntity } from '../../../src/users/persistence/saldo-usuario.entity';
import { LigaEntity } from '../../../src/players/persistence/liga.entity';
import { EquipoEntity } from '../../../src/players/persistence/equipo.entity';
import { JugadorEntity } from '../../../src/players/persistence/jugador.entity';
import { EstadisticasJugadorEntity } from '../../../src/players/persistence/estadisticas-jugador.entity';
import { HistorialCotizacionEntity } from '../../../src/players/persistence/historial-cotizacion.entity';
import { VersionEstrategiaCotizacionEntity } from '../../../src/players/persistence/version-estrategia-cotizacion.entity';
import { RecalculoCotizacionEntity } from '../../../src/players/persistence/recalculo-cotizacion.entity';
import { RecalculoCotizacionActivoEntity } from '../../../src/players/persistence/recalculo-cotizacion-activo.entity';
import { CotizacionVigenteEntity } from '../../../src/players/persistence/cotizacion-vigente.entity';
import { TokenJugadorEntity } from '../../../src/market/persistence/token-jugador.entity';
import { TenenciaJugadorEntity } from '../../../src/market/persistence/tenencia-jugador.entity';
import { OrdenCompraEntity } from '../../../src/orders/persistence/orden-compra.entity';
import { AuditoriaOrdenCompraEntity } from '../../../src/orders/persistence/auditoria-orden-compra.entity';
import { CreateUsuarios1710000000000 } from '../../../migrations/1710000000000-CreateUsuarios';
import { CreateCatalogoJugadores1727000000000 } from '../../../migrations/1727000000000-CreateCatalogoJugadores';
import { CreateEstadisticasJugadores1790275835000 } from '../../../migrations/1790275835000-CreateEstadisticasJugadores';
import { RenameEntradasAndAllowPerGameStats1790275836000 } from '../../../migrations/1790275836000-RenameEntradasAndAllowPerGameStats';
import { AddUserRoles1790275837000 } from '../../../migrations/1790275837000-AddUserRoles';
import { CreateHistorialCotizacion1790275838000 } from '../../../migrations/1790275838000-CreateHistorialCotizacion';
import { CreateCotizacionRecalculos1790275839000 } from '../../../migrations/1790275839000-CreateCotizacionRecalculos';
import { ExtendHistorialCotizacionForMarketOpening1790275839000 } from '../../../migrations/1790275839000-ExtendHistorialCotizacionForMarketOpening';
import { CreateCotizacionVigente1790275840000 } from '../../../migrations/1790275840000-CreateCotizacionVigente';
import { CreateSaldosUsuario1790275840000 } from '../../../migrations/1790275840000-CreateSaldosUsuario';
import { CurrentQuotesPerStrategy1790275841000 } from '../../../migrations/1790275841000-CurrentQuotesPerStrategy';
import { CreateTokens1790275841000 } from '../../../migrations/1790275841000-CreateTokens';
import { CreateTenenciasJugador1790275842000 } from '../../../migrations/1790275842000-CreateTenenciasJugador';
import { CreateOrdenesCompra1790275843000 } from '../../../migrations/1790275843000-CreateOrdenesCompra';

const POSTGRES_IMAGE = 'postgres:16-alpine';
const POSTGRES_PORT = 5432;
const CATALOG_API_KEY = 'orders-test-catalog-key-abcdefghijklmnopqrstuvwxyz';

export interface OrdersIntegrationApp {
  app: INestApplication;
  dataSource: DataSource;
  superadminEmail: string;
  close(): Promise<void>;
  resetData(): Promise<void>;
}

export async function createOrdersIntegrationApp(
  options: { superadmin?: { email: string; password: string } } = {},
): Promise<OrdersIntegrationApp> {
  const superadmin = options.superadmin ?? {
    email: 'admin@example.com',
    password: 'admin-password',
  };
  const previous = {
    databaseUrl: process.env.DATABASE_URL,
    superadminEmail: process.env.SUPERADMIN_EMAIL,
    superadminPassword: process.env.SUPERADMIN_PASSWORD,
    catalogApiKey: process.env.CATALOG_REFRESH_API_KEY,
  };
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
  const databaseUrl = `postgres://postgres:postgres@${container.getHost()}:${container.getMappedPort(POSTGRES_PORT)}/football_market`;
  process.env.DATABASE_URL = databaseUrl;
  process.env.SUPERADMIN_EMAIL = superadmin.email;
  process.env.SUPERADMIN_PASSWORD = superadmin.password;
  process.env.CATALOG_REFRESH_API_KEY = CATALOG_API_KEY;

  const dataSource = new DataSource({
    type: 'postgres',
    url: databaseUrl,
    entities: [
      UserEntity,
      SaldoUsuarioEntity,
      LigaEntity,
      EquipoEntity,
      JugadorEntity,
      EstadisticasJugadorEntity,
      HistorialCotizacionEntity,
      VersionEstrategiaCotizacionEntity,
      RecalculoCotizacionEntity,
      RecalculoCotizacionActivoEntity,
      CotizacionVigenteEntity,
      TokenJugadorEntity,
      TenenciaJugadorEntity,
      OrdenCompraEntity,
      AuditoriaOrdenCompraEntity,
    ],
    migrations: [
      CreateUsuarios1710000000000,
      CreateCatalogoJugadores1727000000000,
      CreateEstadisticasJugadores1790275835000,
      RenameEntradasAndAllowPerGameStats1790275836000,
      AddUserRoles1790275837000,
      CreateHistorialCotizacion1790275838000,
      CreateCotizacionRecalculos1790275839000,
      ExtendHistorialCotizacionForMarketOpening1790275839000,
      CreateCotizacionVigente1790275840000,
      CreateSaldosUsuario1790275840000,
      CurrentQuotesPerStrategy1790275841000,
      CreateTokens1790275841000,
      CreateTenenciasJugador1790275842000,
      CreateOrdenesCompra1790275843000,
    ],
    dropSchema: true,
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    await dataSource.runMigrations();
    const module = await Test.createTestingModule({
      imports: [AppModule.register('.env.no-test')],
    }).compile();
    const app = module.createNestApplication();
    configureApp(app);
    await app.init();
    return {
      app,
      dataSource,
      superadminEmail: superadmin.email,
      async resetData() {
        await dataSource.query(
          `TRUNCATE TABLE auditorias_orden_compra, ordenes_compra,
           cotizacion_vigente, historial_cotizacion, tenencias_jugador, tokens,
           recalculo_cotizacion_activo, recalculos_cotizacion,
           versiones_estrategia_cotizacion, estadisticas_jugadores, jugadores,
           equipos, ligas, saldos_usuario, usuarios`,
        );
        await dataSource.query(
          `INSERT INTO recalculo_cotizacion_activo (id, id_recalculo, tipo_estrategia)
           VALUES (1, NULL, NULL) ON CONFLICT (id) DO NOTHING`,
        );
      },
      async close() {
        try {
          await app.close();
        } finally {
          if (dataSource.isInitialized) await dataSource.destroy();
          await container.stop();
          restore('DATABASE_URL', previous.databaseUrl);
          restore('SUPERADMIN_EMAIL', previous.superadminEmail);
          restore('SUPERADMIN_PASSWORD', previous.superadminPassword);
          restore('CATALOG_REFRESH_API_KEY', previous.catalogApiKey);
        }
      },
    };
  } catch (error) {
    if (dataSource.isInitialized) await dataSource.destroy();
    await container.stop();
    restore('DATABASE_URL', previous.databaseUrl);
    restore('SUPERADMIN_EMAIL', previous.superadminEmail);
    restore('SUPERADMIN_PASSWORD', previous.superadminPassword);
    restore('CATALOG_REFRESH_API_KEY', previous.catalogApiKey);
    throw error;
  }
}

function restore(key: string, value: string | undefined): void {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
