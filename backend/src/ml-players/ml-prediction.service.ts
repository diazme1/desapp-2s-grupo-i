import { Inject, Injectable, NotFoundException, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PLAYERS_DATA_SOURCE } from '../players/players.module';
import { PLAYERS_REPOSITORY } from '../players/players.repository';
import type { PlayersRepository } from '../players/players.repository';
import { EstrategiaCotizacion, TipoEstrategiaCotizacion, TIPOS_ESTRATEGIA_COTIZACION } from '../players/domain/estrategia-cotizacion';
import { VersionEstrategiaCotizacionEntity } from '../players/persistence/version-estrategia-cotizacion.entity';
import { FastApiPredictionAdapter, FastApiTechnicalError, FastApiTrainingValidationError, type FastApiTrainingResult } from './fastapi-prediction.adapter';
import { normalizarEstadisticasPredichas } from './domain/estadisticas-predichas';

export interface PlayerQuotePrediction {
  estado: 'disponible' | 'no_disponible';
  cotizacionActual: string | null;
  cotizacionPredicha: string | null;
  prediccionDisponible: boolean;
  fechaGeneracion: string;
  fechaObjetivo: string;
  versionModelo: string | null;
  versionEstrategia: string | null;
  origenDatos: string[];
  estadisticasPredichas: Record<string, string> | null;
  mensaje?: string;
}

@Injectable()
export class MlPredictionService {
  constructor(
    @Inject(PLAYERS_REPOSITORY) private readonly players: PlayersRepository,
    @Inject(PLAYERS_DATA_SOURCE) private readonly dataSource: DataSource,
    private readonly adapter: FastApiPredictionAdapter,
  ) {}

  async obtener(idJugador: string): Promise<PlayerQuotePrediction> {
    const player = await this.players.buscarPorId(idJugador);
    if (!player) throw new NotFoundException('Jugador no encontrado.');

    const fechaGeneracion = new Date();
    const fechaObjetivo = new Date(fechaGeneracion);
    fechaObjetivo.setUTCDate(fechaObjetivo.getUTCDate() + 15);
    const tipoEstrategia = await this.obtenerEstrategiaActiva();
    const version = tipoEstrategia ? await this.dataSource.getRepository(VersionEstrategiaCotizacionEntity).findOne({ where: { tipoEstrategia }, order: { numeroVersion: 'DESC' } }) : null;
    const cotizacionActual = tipoEstrategia ? await this.obtenerCotizacionActual(idJugador, tipoEstrategia) : null;
    const base = {
      cotizacionActual,
      cotizacionPredicha: null,
      prediccionDisponible: false,
      fechaGeneracion: fechaGeneracion.toISOString(),
      fechaObjetivo: fechaObjetivo.toISOString().slice(0, 10),
      versionModelo: null,
      versionEstrategia: version ? `${version.tipoEstrategia}@${version.numeroVersion}` : null,
      origenDatos: [] as string[],
      estadisticasPredichas: null,
    };

    if (!tipoEstrategia || !version) return { ...base, estado: 'no_disponible', mensaje: 'No hay una estrategia de cotizacion disponible.' };
    const current = [...player.estadisticas].reverse().find((stats) => [stats.goles, stats.asistencias, stats.tiros, stats.pasesClave, stats.regates, stats.faltasCometidas, stats.ratingWhoScored].some((value) => value !== null));
    if (!current) return { ...base, estado: 'no_disponible', mensaje: 'No hay estadisticas suficientes para predecir.' };

    let prediction;
    try {
      prediction = await this.adapter.predecir({
        fechaGeneracion: fechaGeneracion.toISOString(),
        fechaObjetivo: fechaObjetivo.toISOString().slice(0, 10),
        position: player.jugador.posicion ?? 'unknown',
        features: {
          goles: String(Math.max(0, Math.round(current.goles ?? 0))),
          asistencias: String(Math.max(0, Math.round(current.asistencias ?? 0))),
          tiros: Number(current.tiros ?? 0).toFixed(3),
          pasesClave: Number(current.pasesClave ?? 0).toFixed(3),
          regates: Number(current.regates ?? 0).toFixed(3),
          faltasCometidas: Number(current.faltasCometidas ?? 0).toFixed(3),
          ratingWhoScored: Number(current.ratingWhoScored ?? 0).toFixed(3),
        },
      });
    } catch (error) {
      if (error instanceof FastApiTechnicalError) throw new ServiceUnavailableException('El servicio de prediccion no esta disponible.');
      throw error;
    }

    if (prediction.estado !== 'ready' || !prediction.estadisticasPredichas || !prediction.versionModelo) {
      return { ...base, estado: 'no_disponible', mensaje: 'No hay un modelo disponible.' };
    }

    const estadisticas = normalizarEstadisticasPredichas({ ...prediction.estadisticasPredichas, rating: prediction.estadisticasPredichas.ratingWhoScored });
    const cotizacionPredicha = EstrategiaCotizacion.desdeVersion(version).calcular({
      goles: Number(estadisticas.goles), asistencias: Number(estadisticas.asistencias), tiros: Number(estadisticas.tiros), pasesClave: Number(estadisticas.pasesClave), regates: Number(estadisticas.regates), faltasCometidas: Number(estadisticas.faltasCometidas), ratingWhoScored: Number(estadisticas.rating),
    });
    return { ...base, estado: 'disponible', cotizacionPredicha, prediccionDisponible: true, versionModelo: prediction.versionModelo, origenDatos: prediction.origenDatos ?? ['whoscored'], estadisticasPredichas: estadisticas };
  }

  async entrenar(request: Parameters<FastApiPredictionAdapter['entrenar']>[0]): Promise<FastApiTrainingResult> {
    try {
      return await this.adapter.entrenar(request);
    } catch (error) {
      if (error instanceof FastApiTrainingValidationError) {
        throw new UnprocessableEntityException('El dataset no permite entrenar.');
      }
      if (error instanceof FastApiTechnicalError) {
        throw new ServiceUnavailableException('El entrenamiento no está disponible.');
      }
      throw error;
    }
  }

  private async obtenerEstrategiaActiva(): Promise<TipoEstrategiaCotizacion | null> {
    const rows = await this.dataSource.query('SELECT tipo_estrategia AS "tipoEstrategia" FROM recalculo_cotizacion_activo WHERE id = 1');
    const tipo = rows[0]?.tipoEstrategia;
    return tipo === TIPOS_ESTRATEGIA_COTIZACION.ATAQUE_DECISIVO || tipo === TIPOS_ESTRATEGIA_COTIZACION.CREACION_TECNICA ? tipo : null;
  }

  private async obtenerCotizacionActual(idJugador: string, tipoEstrategia: TipoEstrategiaCotizacion): Promise<string | null> {
    const rows = await this.dataSource.query('SELECT cotizacion FROM cotizacion_vigente WHERE id_jugador = $1 AND tipo_estrategia = $2 LIMIT 1', [idJugador, tipoEstrategia]);
    return rows[0]?.cotizacion === undefined ? null : Number(rows[0].cotizacion).toFixed(2);
  }
}
