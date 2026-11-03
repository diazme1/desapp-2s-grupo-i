import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MlPlayersController } from '../../../src/ml-players/ml-players.controller';
import { PredictionResponseDto } from '../../../src/ml-players/dto/prediction-response.dto';
import { PredictionUnavailableResponseDto } from '../../../src/ml-players/dto/prediction-unavailable-response.dto';
import { TrainingRequestDto } from '../../../src/ml-players/dto/training-request.dto';
import { TrainingResponseDto } from '../../../src/ml-players/dto/training-response.dto';
import { MlPlayersModule } from '../../../src/ml-players/ml-players.module';
import { MlPredictionService } from '../../../src/ml-players/ml-prediction.service';

describe('MlPlayersController', () => {
  it('declara el módulo de predicciones como módulo NestJS', () => {
    expect(MlPlayersModule).toBeDefined();
  });

  it('expone la consulta de predicción autenticada', async () => {
    const predictions = {
      obtener: jest.fn().mockResolvedValue({ estado: 'no_disponible' }),
      entrenar: jest.fn(),
    } as unknown as jest.Mocked<MlPredictionService>;
    const controller = new MlPlayersController(predictions);

    expect(Reflect.getMetadata(PATH_METADATA, MlPlayersController.prototype.prediction)).toBe(
      'players/:id/prediction',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, MlPlayersController.prototype.prediction)).toBe(
      RequestMethod.GET,
    );
    await expect(controller.prediction('player-id')).resolves.toEqual({ estado: 'no_disponible' });
    expect(predictions.obtener).toHaveBeenCalledWith('player-id');
  });

  it('expone el entrenamiento administrativo y delega el body', async () => {
    const trainingResult = { estado: 'entrenado', versionModelo: 'model-1' };
    const predictions = {
      obtener: jest.fn(),
      entrenar: jest.fn().mockResolvedValue(trainingResult),
    } as unknown as jest.Mocked<MlPredictionService>;
    const controller = new MlPlayersController(predictions);
    const body = { origenDatos: 'whoscored', snapshots: [] } as any;

    expect(Reflect.getMetadata(PATH_METADATA, MlPlayersController.prototype.entrenar)).toBe(
      'ml-players/train',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, MlPlayersController.prototype.entrenar)).toBe(
      RequestMethod.POST,
    );
    await expect(controller.entrenar(body)).resolves.toEqual(trainingResult);
    expect(predictions.entrenar).toHaveBeenCalledWith(body);
  });

  it('valida snapshots y materializa los DTOs públicos', async () => {
    const valid = plainToInstance(TrainingRequestDto, {
      origenDatos: 'whoscored',
      snapshots: [{
        playerId: 'external-1',
        season: '2025/26',
        date: '2026-01-01',
        statistics: { goles: 1, rating: 7.2 },
        granularity: 'match',
        position: 'Forward',
      }],
    });
    expect(await validate(valid)).toHaveLength(0);

    const invalid = plainToInstance(TrainingRequestDto, {
      origenDatos: 'unknown',
      snapshots: [{ playerId: '', season: '', date: 'not-a-date', statistics: 'invalid' }],
    });
    expect(await validate(invalid)).not.toHaveLength(0);
    expect(new PredictionResponseDto()).toBeInstanceOf(PredictionResponseDto);
    expect(new PredictionUnavailableResponseDto()).toBeInstanceOf(PredictionUnavailableResponseDto);
    expect(new TrainingResponseDto()).toBeInstanceOf(TrainingResponseDto);
  });
});
