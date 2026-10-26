import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ListarRankingDto } from './dto/listar-ranking.dto';
import { RankingCotizacionesResponseDto } from './dto/ranking-cotizaciones-response.dto';
import { RankingCotizacionesService } from './ranking-cotizaciones.service';

@ApiTags('Jugadores')
@Controller('players')
export class RankingController {
  constructor(private readonly ranking: RankingCotizacionesService) {}

  @Get('ranking')
  @ApiOperation({
    summary: 'Listar el ranking de cotizaciones por estrategia',
    description:
      'Lee la última cotización vigente de la estrategia indicada. Si se omite, usa la estrategia activa; cambiar el filtro no recalcula cotizaciones.',
  })
  @ApiOkResponse({ type: RankingCotizacionesResponseDto })
  @ApiResponse({ status: 422, description: 'La estrategia no es válida.' })
  listar(@Query() query: ListarRankingDto) {
    return this.ranking.listar(query.estrategia);
  }
}
