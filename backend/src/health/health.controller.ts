import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { HealthResponseDto } from './dto/health-response.dto';

@ApiTags('Salud')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({
    operationId: 'consultarSalud',
    summary: 'Comprobar que el servidor responde',
  })
  @ApiOkResponse({
    description: 'El servidor está atendiendo peticiones.',
    type: HealthResponseDto,
  })
  getHealth(): HealthResponseDto {
    return this.healthService.getHealth();
  }
}
