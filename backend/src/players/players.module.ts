import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DATABASE_DATA_SOURCE, DatabaseModule } from '../database/database.module';
import { ActualizarCatalogoService } from './actualizar-catalogo.service';
import {
  FootballDataAdapter,
  FOOTBALL_DATA_ADAPTER,
} from './adapters/football-data/football-data.adapter';
import { WhoScoredAdapter } from './adapters/whoscored/whoscored.adapter';
import { CatalogoJugadoresService } from './catalogo-jugadores.service';
import { EstadisticasJugadorService } from './estadisticas-jugador.service';
import { TypeOrmPlayersRepository } from './persistence/typeorm-players.repository';
import { PlayersController } from './players.controller';
import { PLAYERS_REPOSITORY } from './players.repository';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [PlayersController],
  providers: [
    FootballDataAdapter,
    {
      provide: FOOTBALL_DATA_ADAPTER,
      useExisting: FootballDataAdapter,
    },
    {
      provide: TypeOrmPlayersRepository,
      inject: [DATABASE_DATA_SOURCE],
      useFactory: (dataSource: import('typeorm').DataSource) =>
        new TypeOrmPlayersRepository(dataSource),
    },
    {
      provide: PLAYERS_REPOSITORY,
      useExisting: TypeOrmPlayersRepository,
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
    ActualizarCatalogoService,
  ],
  exports: [PLAYERS_REPOSITORY, CatalogoJugadoresService, ActualizarCatalogoService],
})
export class PlayersModule {}
