import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuperadminGuard } from '../auth/guards/superadmin.guard';
import { MlPredictionService } from './ml-prediction.service';
import { PredictionResponseDto } from './dto/prediction-response.dto';
import { PredictionUnavailableResponseDto } from './dto/prediction-unavailable-response.dto';
import { TrainingRequestDto } from './dto/training-request.dto';
import { TrainingResponseDto } from './dto/training-response.dto';

@ApiTags('Jugadores')
@Controller()
export class MlPlayersController {
  constructor(private readonly predictions: MlPredictionService) {}

  @Get('players/:id/prediction')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Consultar cotizacion actual y posible de un jugador' })
  @ApiOkResponse({ type: PredictionResponseDto })
  @ApiResponse({ status: HttpStatus.OK, type: PredictionUnavailableResponseDto })
  @ApiResponse({ status: HttpStatus.SERVICE_UNAVAILABLE, description: 'FastAPI indisponible o fallo tecnico.' })
  async prediction(@Param('id', new ParseUUIDPipe({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY })) id: string) {
    return this.predictions.obtener(id);
  }

  @Post('ml-players/train')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, SuperadminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Entrenar y dejar disponible el modelo de estadísticas' })
  @ApiOkResponse({ type: TrainingResponseDto })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'Los snapshots no permiten entrenar.' })
  @ApiResponse({ status: HttpStatus.SERVICE_UNAVAILABLE, description: 'FastAPI no está disponible o falló el entrenamiento.' })
  @ApiForbiddenResponse({ description: 'La operación requiere rol superadmin.' })
  entrenar(@Body() body: TrainingRequestDto) {
    return this.predictions.entrenar(body);
  }
}
