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
import { CotizacionVigenteEntity } from './persistence/cotizacion-vigente.entity';
import { VersionEstrategiaCotizacionEntity } from './persistence/version-estrategia-cotizacion.entity';
import { RecalculoCotizacionEntity } from './persistence/recalculo-cotizacion.entity';
import { RecalculoCotizacionActivoEntity } from './persistence/recalculo-cotizacion-activo.entity';
import { TypeOrmPlayersRepository } from './persistence/typeorm-players.repository';
import { PLAYERS_REPOSITORY } from './players.repository';
import { PlayersController } from './players.controller';
import { HistorialCotizacionService } from '../quotes/historial-cotizacion.service';
import { QUOTE_HISTORY_REPOSITORY } from '../quotes/quotes.repository';
import { QuotesController } from '../quotes/quotes.controller';
import { RecalcularCotizacionesService } from '../quotes/recalcular-cotizaciones.service';
import { QUOTE_RECALCULATION_REPOSITORY } from '../quotes/quote-recalculation.repository';
import { QUOTE_RANKING_REPOSITORY } from '../quotes/quote-ranking.repository';
import { RankingCotizacionesService } from '../quotes/ranking-cotizaciones.service';
import { RankingController } from '../quotes/ranking.controller';

@Module({
  imports: [AuthModule],
  controllers: [RankingController, PlayersController, QuotesController],
  providers: [
    FootballDataAdapter,
    {
      provide: FOOTBALL_DATA_ADAPTER,
      useExisting: FootballDataAdapter,
    },
    {
      provide: TypeOrmPlayersRepository,
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
            LigaEntity,
            EquipoEntity,
            JugadorEntity,
            EstadisticasJugadorEntity,
            HistorialCotizacionEntity,
            CotizacionVigenteEntity,
            VersionEstrategiaCotizacionEntity,
            RecalculoCotizacionEntity,
            RecalculoCotizacionActivoEntity,
          ],
          synchronize: false,
        });
        await dataSource.initialize();
        return new TypeOrmPlayersRepository(dataSource);
      },
    },
    {
      provide: QUOTE_HISTORY_REPOSITORY,
      useExisting: TypeOrmPlayersRepository,
    },
    {
      provide: QUOTE_RECALCULATION_REPOSITORY,
      useExisting: TypeOrmPlayersRepository,
    },
    {
      provide: QUOTE_RANKING_REPOSITORY,
      useExisting: TypeOrmPlayersRepository,
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
    HistorialCotizacionService,
    RecalcularCotizacionesService,
    RankingCotizacionesService,
    ActualizarCatalogoService,
  ],
  exports: [
    PLAYERS_REPOSITORY,
    CatalogoJugadoresService,
    ActualizarCatalogoService,
  ],
})
export class PlayersModule {}
