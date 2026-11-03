import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface FastApiPredictionRequest {
  fechaGeneracion: string;
  fechaObjetivo: string;
  features: Record<string, string>;
  position?: string;
}

export interface FastApiPredictionResult {
  estado: 'ready' | 'no_model_loaded';
  versionModelo?: string | null;
  estadisticasPredichas?: Record<string, string> | null;
  versionDataset?: string | null;
  versionTransformaciones?: string | null;
  origenDatos?: string[] | null;
  estadisticasSchema?: Record<string, { scale: number }> | null;
}

export interface FastApiTrainingRequest {
  origenDatos: 'whoscored' | 'app' | 'synthetic';
  snapshots?: Array<{
    playerId: string;
    season: string;
    date: string;
    statistics: Record<string, number>;
    granularity?: string;
    position?: string;
  }>;
}

export interface FastApiTrainingResult {
  estado: 'entrenado';
  versionModelo: string;
  versionDataset: string;
  versionTransformaciones: string;
  origenDatos: string;
  cantidadSnapshots: number;
  cantidadEjemplos: number;
  metricas: Record<string, unknown>;
}

export class FastApiTechnicalError extends Error {}
export class FastApiTrainingValidationError extends Error {}

@Injectable()
export class FastApiPredictionAdapter {
  constructor(private readonly config: ConfigService) {}

  async predecir(request: FastApiPredictionRequest): Promise<FastApiPredictionResult> {
    const baseUrl = this.config.get<string>('ML_FASTAPI_BASE_URL', 'http://localhost:8000').replace(/\/$/, '');
    const token = this.config.get<string>('ML_FASTAPI_INTERNAL_TOKEN', 'dev-ml-token');
    const timeoutMs = this.config.get<number>('ML_FASTAPI_TIMEOUT_MS', 3000);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${baseUrl}/internal/predict`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'X-ML-Internal-Token': token },
        body: JSON.stringify(request),
        signal: controller.signal,
      });
      if (!response.ok) throw new FastApiTechnicalError(`FastAPI respondió ${response.status}`);
      const body = (await response.json()) as FastApiPredictionResult;
      if (body.estado !== 'ready' && body.estado !== 'no_model_loaded') throw new FastApiTechnicalError('Respuesta de FastAPI inválida');
      if (body.estado === 'ready' && (!body.estadisticasPredichas || typeof body.versionModelo !== 'string')) throw new FastApiTechnicalError('Respuesta de estadísticas inválida');
      return body;
    } catch (error) {
      if (error instanceof FastApiTechnicalError) throw error;
      throw new FastApiTechnicalError('FastAPI no está disponible.');
    } finally {
      clearTimeout(timeout);
    }
  }

  async entrenar(request: FastApiTrainingRequest): Promise<FastApiTrainingResult> {
    const baseUrl = this.config.get<string>('ML_FASTAPI_BASE_URL', 'http://localhost:8000').replace(/\/$/, '');
    const token = this.config.get<string>('ML_FASTAPI_INTERNAL_TOKEN', 'dev-ml-token');
    const timeoutMs = this.config.get<number>('ML_FASTAPI_TRAINING_TIMEOUT_MS', 600000);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${baseUrl}/internal/train`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'X-ML-Internal-Token': token },
        body: JSON.stringify(request),
        signal: controller.signal,
      });
      if (response.status === 422) {
        throw new FastApiTrainingValidationError(await response.text());
      }
      if (!response.ok) {
        const detail = await response.text();
        throw new FastApiTechnicalError(`FastAPI respondió ${response.status}: ${detail}`);
      }
      const body = (await response.json()) as FastApiTrainingResult;
      if (body.estado !== 'entrenado' || !body.versionModelo || !body.versionDataset || !body.metricas) {
        throw new FastApiTechnicalError('Respuesta de entrenamiento inválida');
      }
      return body;
    } catch (error) {
      if (error instanceof FastApiTrainingValidationError) throw error;
      if (error instanceof FastApiTechnicalError) throw error;
      throw new FastApiTechnicalError('FastAPI no está disponible o el entrenamiento falló.');
    } finally {
      clearTimeout(timeout);
    }
  }
}
