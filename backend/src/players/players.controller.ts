import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiSecurity,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CatalogRefreshApiKeyGuard } from '../auth/guards/catalog-refresh-api-key.guard';
import { ActualizarCatalogoService } from './actualizar-catalogo.service';
import { CatalogoJugadoresService } from './catalogo-jugadores.service';
import { ActualizarCatalogoDto } from './dto/actualizar-catalogo.dto';
import { JugadorDetalleResponseDto } from './dto/jugador-detalle-response.dto';
import { JugadorResponseDto } from './dto/jugador-response.dto';
import { ListarJugadoresDto } from './dto/listar-jugadores.dto';
import { RefreshCatalogoResponseDto } from './dto/refresh-catalogo-response.dto';

@ApiTags('Jugadores')
@Controller()
export class PlayersController {
  constructor(
    private readonly catalogo: CatalogoJugadoresService,
    private readonly actualizar: ActualizarCatalogoService,
  ) {}

  @Get('players')
  @ApiOperation({ summary: 'Listar el catálogo local de jugadores' })
  @ApiOkResponse({ type: [JugadorResponseDto], description: 'Jugadores persistidos localmente.' })
  @ApiResponse({ status: 422, description: 'Parámetros de búsqueda inválidos.' })
  async listar(@Query() query: ListarJugadoresDto) {
    const jugadores = await this.catalogo.listar(query);
    return jugadores.map((jugador) => JugadorResponseDto.from(jugador));
  }

  @Get('players/:id')
  @ApiOperation({ summary: 'Obtener el detalle local de un jugador' })
  @ApiOkResponse({ type: JugadorDetalleResponseDto })
  @ApiResponse({ status: 404, description: 'Jugador no encontrado.' })
  @ApiResponse({ status: 422, description: 'El identificador no es válido.' })
  async buscarPorId(
    @Param('id', new ParseUUIDPipe({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY })) id: string,
  ) {
    return JugadorDetalleResponseDto.from(await this.catalogo.buscarPorId(id));
  }

  @Post('catalog/refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, CatalogRefreshApiKeyGuard)
  @ApiSecurity({ bearerAuth: [], catalogRefreshApiKey: [] })
  @ApiOperation({ summary: 'Actualizar una liga del catálogo base desde Football-Data.org' })
  @ApiOkResponse({ type: RefreshCatalogoResponseDto })
  @ApiResponse({ status: 401, description: 'Autenticación requerida o credenciales inválidas.' })
  @ApiResponse({ status: 422, description: 'Parámetros de actualización inválidos.' })
  @ApiResponse({ status: 503, description: 'La fuente externa no está disponible.' })
  actualizarCatalogo(@Query() query: ActualizarCatalogoDto) {
    return this.actualizar.ejecutar(query.ligaCodigo);
  }
}
