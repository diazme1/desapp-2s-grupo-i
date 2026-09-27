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

  async ejecutar(ligaCodigo?: string) {
    let catalogo;
    const inicioExtraccion = Date.now();
    try {
      catalogo = await this.source.obtenerCatalogo(ligaCodigo);
    } catch (error) {
      const message =
        error instanceof FootballDataError
          ? error.message
          : 'Football-Data.org no está disponible en este momento.';
      throw new ServiceUnavailableException(message);
    }
    const tiempoExtraccionMs = Date.now() - inicioExtraccion;
    const resumen = await this.players.guardarCatalogo(catalogo);
    return {
      fuente: 'Football-Data.org',
      ...resumen,
      tiempoExtraccionMs,
      tiempoExtraccion: this.formatearDuracion(tiempoExtraccionMs),
      actualizadoEn: new Date().toISOString(),
    };
  }

  private formatearDuracion(milisegundos: number): string {
    return `${(milisegundos / 1000).toFixed(2)} s`;
  }
}
