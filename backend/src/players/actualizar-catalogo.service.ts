import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import {
  FOOTBALL_DATA_ADAPTER,
  FootballDataError,
} from './adapters/football-data/football-data.adapter';
import type { FootballDataPort } from './adapters/football-data/football-data.adapter';
import {
  EstadisticasJugadorService,
  type ResultadoEstadisticasLiga,
} from './estadisticas-jugador.service';
import { PLAYERS_REPOSITORY } from './players.repository';
import type { PlayersRepository } from './players.repository';
import { Inject } from '@nestjs/common';

export type EstadoEstadisticasRefresh = 'completo' | 'parcial' | 'sin_estadisticas';

export interface ResumenEstadisticasRefresh {
  estado: EstadoEstadisticasRefresh;
  procesados: number;
  exitosos: number;
  parciales: number;
  fallidos: number;
}

@Injectable()
export class ActualizarCatalogoService {
  constructor(
    @Inject(FOOTBALL_DATA_ADAPTER) private readonly source: FootballDataPort,
    @Inject(PLAYERS_REPOSITORY) private readonly players: PlayersRepository,
    private readonly estadisticasJugador: EstadisticasJugadorService,
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
    const gruposPorLiga = new Map<string, typeof resumen.jugadoresProcesados>();
    for (const jugador of resumen.jugadoresProcesados) {
      const grupo = gruposPorLiga.get(jugador.ligaEquipoJugador) ?? [];
      grupo.push(jugador);
      gruposPorLiga.set(jugador.ligaEquipoJugador, grupo);
    }

    const resultados: ResultadoEstadisticasLiga[] = [];
    for (const [liga, jugadores] of gruposPorLiga) {
      try {
        resultados.push(await this.estadisticasJugador.actualizarEstadisticasLiga(liga, jugadores));
      } catch (error) {
        resultados.push({
          estado: 'sin_estadisticas',
          procesados: jugadores.length,
          exitosos: 0,
          parciales: 0,
          fallidos: jugadores.length,
          detalle: error instanceof Error ? error.message : 'No se pudieron obtener las estadisticas.',
        });
      }
    }

    const exitosos = resultados.reduce((total, resultado) => total + resultado.exitosos, 0);
    const parciales = resultados.reduce((total, resultado) => total + resultado.parciales, 0);
    const fallidos = resultados.reduce((total, resultado) => total + resultado.fallidos, 0);
    const persistibles = exitosos + parciales;
    const estadisticas: ResumenEstadisticasRefresh = {
      estado:
        persistibles === 0
          ? 'sin_estadisticas'
          : fallidos > 0 || parciales > 0
            ? 'parcial'
            : 'completo',
      procesados: resumen.jugadoresProcesados.length,
      exitosos,
      parciales,
      fallidos,
    };
    const { jugadoresProcesados: _jugadoresProcesados, ...resumenPublico } = resumen;
    return {
      fuente: 'Football-Data.org',
      ...resumenPublico,
      estadisticas,
      tiempoExtraccionMs,
      tiempoExtraccion: this.formatearDuracion(tiempoExtraccionMs),
      actualizadoEn: new Date().toISOString(),
    };
  }

  private formatearDuracion(milisegundos: number): string {
    return `${(milisegundos / 1000).toFixed(2)} s`;
  }
}
