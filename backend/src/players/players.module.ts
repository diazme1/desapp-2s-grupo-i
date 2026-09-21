import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { CatalogoJugadoresService } from './catalogo-jugadores.service';
import { PlayersController } from './players.controller';
import { JUGADOR_REPOSITORY } from './players.repository';
import { EquipoEntity } from './persistence/equipo.entity';
import { IdentidadExternaJugadorEntity } from './persistence/identidad-externa-jugador.entity';
import { JugadorEntity } from './persistence/jugador.entity';
import { LigaEntity } from './persistence/liga.entity';
import { TypeOrmJugadorRepository } from './persistence/typeorm-jugador.repository';

@Module({
  controllers: [PlayersController],
  providers: [
    CatalogoJugadoresService,
    {
      provide: JUGADOR_REPOSITORY,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const url = config.get<string>('DATABASE_URL');
        if (!url) throw new Error('DATABASE_URL es obligatoria para iniciar el catalogo.');
        const dataSource = new DataSource({
          type: 'postgres',
          url,
          entities: [LigaEntity, EquipoEntity, JugadorEntity, IdentidadExternaJugadorEntity],
          synchronize: false,
        });
        await dataSource.initialize();
        return new TypeOrmJugadorRepository(dataSource);
      },
    },
  ],
  exports: [CatalogoJugadoresService, JUGADOR_REPOSITORY],
})
export class JugadoresModule {}
