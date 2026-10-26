import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { AuthModule } from '../auth/auth.module';
import { ActualizarCatalogoService } from './actualizar-catalogo.service';
import {
  FootballDataAdapter,
  FOOTBALL_DATA_ADAPTER,
} from './adapters/football-data/football-data.adapter';
import { WhoScoredAdapter } from './adapters/whoscored/whoscored.adapter';
import { CatalogoJugadoresService } from './catalogo-jugadores.service';
import { EstadisticasJugadorService } from './estadisticas-jugador.service';
import { EquipoEntity } from './persistence/equipo.entity';
import { EstadisticasJugadorEntity } from './persistence/estadisticas-jugador.entity';
import { JugadorEntity } from './persistence/jugador.entity';
import { LigaEntity } from './persistence/liga.entity';
import { HistorialCotizacionEntity } from './persistence/historial-cotizacion.entity';
import { TypeOrmPlayersRepository } from './persistence/typeorm-players.repository';
import { TypeOrmQuoteOpeningWriter } from './persistence/typeorm-quote-opening-writer';
import { TokenJugadorEntity } from '../market/persistence/token-jugador.entity';
import { TenenciaJugadorEntity } from '../market/persistence/tenencia-jugador.entity';
import { UserEntity } from '../users/persistence/user.entity';
import { PLAYERS_REPOSITORY } from './players.repository';
import { PlayersController } from './players.controller';
import { HistorialCotizacionService } from '../quotes/historial-cotizacion.service';
import { QUOTE_HISTORY_REPOSITORY } from '../quotes/quotes.repository';
import { QUOTE_OPENING_WRITER } from '../quotes/quote-opening-writer';

export const PLAYERS_DATA_SOURCE = Symbol('PLAYERS_DATA_SOURCE');

@Module({
  imports: [AuthModule],
  controllers: [PlayersController],
  providers: [
    FootballDataAdapter,
    {
      provide: FOOTBALL_DATA_ADAPTER,
      useExisting: FootballDataAdapter,
    },
    {
      provide: PLAYERS_DATA_SOURCE,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const url = config.get<string>('DATABASE_URL');
        if (!url)
          throw new Error(
            'DATABASE_URL es obligatoria para el catálogo de jugadores.',
          );
        const dataSource = new DataSource({
          type: 'postgres',
          url,
          entities: [
            UserEntity,
            LigaEntity,
            EquipoEntity,
            JugadorEntity,
            EstadisticasJugadorEntity,
            HistorialCotizacionEntity,
            TokenJugadorEntity,
            TenenciaJugadorEntity,
          ],
          synchronize: false,
        });
        await dataSource.initialize();
        return dataSource;
      },
    },
    {
      provide: PLAYERS_REPOSITORY,
      inject: [PLAYERS_DATA_SOURCE],
      useFactory: (dataSource: DataSource) =>
        new TypeOrmPlayersRepository(dataSource),
    },
    {
      provide: QUOTE_OPENING_WRITER,
      useClass: TypeOrmQuoteOpeningWriter,
    },
    {
      provide: QUOTE_HISTORY_REPOSITORY,
      inject: [PLAYERS_REPOSITORY],
      useFactory: (players: TypeOrmPlayersRepository) => players,
    },
    WhoScoredAdapter,
    {
      provide: EstadisticasJugadorService,
      inject: [PLAYERS_REPOSITORY, WhoScoredAdapter],
      useFactory: (
        players: TypeOrmPlayersRepository,
        whoscored: WhoScoredAdapter,
      ) =>
        new EstadisticasJugadorService(whoscored, {
          guardar: (estadisticas, context) =>
            players.guardarEstadisticas(estadisticas, context),
        }),
    },
    CatalogoJugadoresService,
    HistorialCotizacionService,
    ActualizarCatalogoService,
  ],
  exports: [
    PLAYERS_REPOSITORY,
    PLAYERS_DATA_SOURCE,
    QUOTE_OPENING_WRITER,
    CatalogoJugadoresService,
    ActualizarCatalogoService,
  ],
})
export class PlayersModule {}
