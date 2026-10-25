import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuperadminGuard } from '../auth/guards/superadmin.guard';
import { RecalcularCotizacionesDto } from './dto/recalcular-cotizaciones.dto';
import { RecalcularCotizacionesResponseDto } from './dto/recalcular-cotizaciones-response.dto';
import { RecalcularCotizacionesService } from './recalcular-cotizaciones.service';

@ApiTags('Cotizaciones')
@Controller('quotes')
export class QuotesController {
  constructor(private readonly recalcular: RecalcularCotizacionesService) {}

  @Post('recalculate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, SuperadminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Recalcular sincrónicamente las cotizaciones de jugadores',
    description:
      'Calcula ambas estrategias v1 con las estadísticas locales más recientes y guarda las dos cotizaciones por jugador. Estrategias (pesos en orden goles, asistencias, tiros, pases clave, regates, rating y faltas): ataque_decisivo 35/25/20/5/5/5/5; creacion_tecnica 5/15/5/30/25/15/5. Las faltas restan, los nulos aportan cero y no se normalizan otra vez los valores guardados. El body elige cuál queda activa para compras y ventas. Ambas corridas se confirman juntas; ante una falla, la estrategia activa anterior se conserva. El ranking permite consultar cualquiera con GET sin recalcular.',
  })
  @ApiOkResponse({ type: RecalcularCotizacionesResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token Bearer requerido o inválido.' })
  @ApiForbiddenResponse({ description: 'La operación requiere rol superadmin.' })
  @ApiResponse({ status: 422, description: 'Estrategia o body inválidos.' })
  @ApiResponse({
    status: 500,
    description: 'Falló la corrida; la corrida activa anterior se conserva.',
  })
  recalcularCotizaciones(@Body() body: RecalcularCotizacionesDto) {
    return this.recalcular.ejecutar(body.estrategia);
  }
}
