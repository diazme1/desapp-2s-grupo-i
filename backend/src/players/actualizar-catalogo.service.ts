import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import {
  FOOTBALL_DATA_ADAPTER,
  FootballDataError,
} from './adapters/football-data/football-data.adapter';
import type { FootballDataPort } from './adapters/football-data/football-data.adapter';
import { PLAYERS_REPOSITORY } from './players.repository';
import type { PlayersRepository } from './players.repository';
import { Inject } from '@nestjs/common';

@Injectable()
export class ActualizarCatalogoService {
  constructor(
    @Inject(FOOTBALL_DATA_ADAPTER) private readonly source: FootballDataPort,
    @Inject(PLAYERS_REPOSITORY) private readonly players: PlayersRepository,
  ) {}

  async ejecutar() {
    let catalogo;
    try {
      catalogo = await this.source.obtenerCatalogo();
    } catch (error) {
      const message =
        error instanceof FootballDataError
          ? error.message
          : 'Football-Data.org no está disponible en este momento.';
      throw new ServiceUnavailableException(message);
    }
    const resumen = await this.players.guardarCatalogo(catalogo);
    return {
      fuente: 'Football-Data.org',
      ...resumen,
      actualizadoEn: new Date().toISOString(),
    };
  }
}
