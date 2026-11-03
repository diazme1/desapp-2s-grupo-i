import { Inject, Injectable, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { AuditoriaTransaccionEntity } from '../market/orders/persistence/auditoria-transaccion.entity';
import { TransaccionMercadoEntity } from '../market/orders/persistence/transaccion-mercado.entity';
import { TenenciaJugadorEntity } from '../market/persistence/tenencia-jugador.entity';
import { TokenJugadorEntity } from '../market/persistence/token-jugador.entity';
import { EquipoEntity } from '../players/persistence/equipo.entity';
import { EstadisticasJugadorEntity } from '../players/persistence/estadisticas-jugador.entity';
import { JugadorEntity } from '../players/persistence/jugador.entity';
import { LigaEntity } from '../players/persistence/liga.entity';
import { HistorialCotizacionEntity } from '../quotes/persistence/historial-cotizacion.entity';
import { CotizacionVigenteEntity } from '../quotes/persistence/cotizacion-vigente.entity';
import { VersionEstrategiaCotizacionEntity } from '../quotes/persistence/version-estrategia-cotizacion.entity';
import { RecalculoCotizacionEntity } from '../quotes/persistence/recalculo-cotizacion.entity';
import { RecalculoCotizacionActivoEntity } from '../quotes/persistence/recalculo-cotizacion-activo.entity';
import { SaldoUsuarioEntity } from '../users/persistence/saldo-usuario.entity';
import { UserEntity } from '../users/persistence/user.entity';

export const DATABASE_DATA_SOURCE = Symbol('DATABASE_DATA_SOURCE');

@Injectable()
class DatabaseDataSourceLifecycle implements OnApplicationShutdown {
  constructor(
    @Inject(DATABASE_DATA_SOURCE) private readonly dataSource: DataSource,
  ) {}

  async onApplicationShutdown(): Promise<void> {
    if (this.dataSource.isInitialized) await this.dataSource.destroy();
  }
}

@Module({
  providers: [
    {
      provide: DATABASE_DATA_SOURCE,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const url = config.get<string>('DATABASE_URL');
        if (!url)
          throw new Error('DATABASE_URL es obligatoria para iniciar la base de datos.');
        const dataSource = new DataSource({
          type: 'postgres',
          url,
          entities: [
            UserEntity,
            SaldoUsuarioEntity,
            LigaEntity,
            EquipoEntity,
            JugadorEntity,
            EstadisticasJugadorEntity,
            HistorialCotizacionEntity,
            CotizacionVigenteEntity,
            VersionEstrategiaCotizacionEntity,
            RecalculoCotizacionEntity,
            RecalculoCotizacionActivoEntity,
            TokenJugadorEntity,
            TenenciaJugadorEntity,
            TransaccionMercadoEntity,
            AuditoriaTransaccionEntity,
          ],
          synchronize: false,
        });
        await dataSource.initialize();
        return dataSource;
      },
    },
    DatabaseDataSourceLifecycle,
  ],
  exports: [DATABASE_DATA_SOURCE],
})
export class DatabaseModule {}
