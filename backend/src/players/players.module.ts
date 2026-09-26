import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { AuthModule } from '../auth/auth.module';
import { ActualizarCatalogoService } from './actualizar-catalogo.service';
import { FootballDataAdapter, FOOTBALL_DATA_ADAPTER } from './adapters/football-data/football-data.adapter';
import { WhoScoredAdapter, WHO_SCORED_LOOKUP } from './adapters/whoscored/whoscored.adapter';
import { CatalogoJugadoresService } from './catalogo-jugadores.service';
import { EstadisticasJugadorService } from './estadisticas-jugador.service';
import { EquipoEntity } from './persistence/equipo.entity';
import { EstadisticasJugadorEntity } from './persistence/estadisticas-jugador.entity';
import { JugadorEntity } from './persistence/jugador.entity';
import { LigaEntity } from './persistence/liga.entity';
import { TypeOrmPlayersRepository } from './persistence/typeorm-players.repository';
import { PLAYERS_REPOSITORY } from './players.repository';
import { PlayersController } from './players.controller';

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
      provide: PLAYERS_REPOSITORY,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const url = config.get<string>('DATABASE_URL');
        if (!url) throw new Error('DATABASE_URL es obligatoria para el catálogo de jugadores.');
        const dataSource = new DataSource({
          type: 'postgres',
          url,
          entities: [LigaEntity, EquipoEntity, JugadorEntity, EstadisticasJugadorEntity],
          synchronize: false,
        });
        await dataSource.initialize();
        return new TypeOrmPlayersRepository(dataSource);
      },
    },
    WhoScoredAdapter,
    {
      provide: WHO_SCORED_LOOKUP,
      useExisting: WhoScoredAdapter,
    },
    {
      provide: EstadisticasJugadorService,
      inject: [PLAYERS_REPOSITORY, WHO_SCORED_LOOKUP],
      useFactory: (players: TypeOrmPlayersRepository, whoscored: WhoScoredAdapter) =>
        new EstadisticasJugadorService(players, whoscored, {
          guardar: (estadisticas, context) => players.guardarEstadisticas(estadisticas, context),
        }),
    },
    CatalogoJugadoresService,
    ActualizarCatalogoService,
  ],
  exports: [PLAYERS_REPOSITORY, CatalogoJugadoresService, ActualizarCatalogoService],
})
export class PlayersModule {}
