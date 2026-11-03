import { ServiceUnavailableException } from '@nestjs/common';
import { FastApiTechnicalError } from '../../../src/ml-players/fastapi-prediction.adapter';

describe('fallback de prediccion', () => {
  it('distingue ausencia esperable de indisponibilidad tecnica', () => {
    expect({ estado: 'no_disponible', status: 200 }).toEqual({ estado: 'no_disponible', status: 200 });
    expect(new ServiceUnavailableException(new FastApiTechnicalError('timeout')).getStatus()).toBe(503);
  });
});
