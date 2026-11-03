import {
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { HistorialCotizacionResponseDto } from './dto/historial-cotizacion-response.dto';
import { ListarCotizacionesDto } from './dto/listar-cotizaciones.dto';
import { HistorialCotizacionService } from './historial-cotizacion.service';

@ApiTags('Cotizaciones')
@Controller('players')
export class QuoteHistoryController {
  constructor(private readonly historialCotizacion: HistorialCotizacionService) {}

  @Get(':id/quotes')
  @ApiOperation({
    summary: 'Listar el historial de cotizaciones de un jugador',
  })
  @ApiOkResponse({ type: HistorialCotizacionResponseDto })
  @ApiResponse({ status: 404, description: 'Jugador no encontrado.' })
  @ApiResponse({
    status: 422,
    description: 'El identificador o la paginación no son válidos.',
  })
  async listar(
    @Param(
      'id',
      new ParseUUIDPipe({
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      }),
    )
    id: string,
    @Query() query: ListarCotizacionesDto,
  ) {
    return HistorialCotizacionResponseDto.from(
      await this.historialCotizacion.listar(id, query),
    );
  }
}
