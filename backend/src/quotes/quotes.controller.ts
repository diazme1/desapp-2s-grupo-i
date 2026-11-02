import {
  Body,
  Controller,
  Get,
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
import { EstrategiasCotizacionResponseDto } from './dto/estrategias-cotizacion-response.dto';
import { RecalcularCotizacionesService } from './recalcular-cotizaciones.service';

@ApiTags('Cotizaciones')
@Controller('quotes')
export class QuotesController {
  constructor(private readonly recalcular: RecalcularCotizacionesService) {}

  @Get('strategies')
  @UseGuards(JwtAuthGuard, SuperadminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Consultar la última configuración de cada estrategia de cotización',
  })
  @ApiOkResponse({ type: EstrategiasCotizacionResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token Bearer requerido o inválido.' })
  @ApiForbiddenResponse({ description: 'La operación requiere rol superadmin.' })
  async listarEstrategias() {
    return { estrategias: await this.recalcular.listarConfiguraciones() };
  }

  @Post('recalculate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, SuperadminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Recalcular sincrónicamente las cotizaciones de jugadores',
    description:
      'Calcula ambas estrategias con las últimas estadísticas. Puede incluir pesos configurados por el superadmin; los pesos de cada estrategia deben ser enteros entre 0 y 100 y sumar 100. Si cambian, se crea una nueva versión inmutable. Las faltas restan, los nulos aportan cero y los valores guardados no se normalizan otra vez. El body elige cuál queda activa para compras y ventas. Ambas corridas y versiones se confirman juntas; ante una falla, el historial y la estrategia activa anterior se conservan.',
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
    return this.recalcular.ejecutar(body.estrategia, body.pesosEstrategias);
  }
}
