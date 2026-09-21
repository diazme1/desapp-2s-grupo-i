import { Controller, Get, Param, Query, ValidationPipe } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CatalogoJugadoresService } from './catalogo-jugadores.service';
import { ListarJugadoresDto } from './dto/listar-jugadores.dto';
import { JugadorResponseDto } from './dto/jugador-response.dto';
import { ListaJugadoresResponseDto } from './dto/lista-jugadores-response.dto';

@ApiTags('Jugadores')
@Controller('players')
export class PlayersController {
  constructor(private readonly catalogo: CatalogoJugadoresService) {}

  @Get()
  @ApiOperation({ operationId: 'listarJugadores', summary: 'Listar jugadores activos' })
  @ApiQuery({ name: 'liga', required: false, description: 'UUID o codigo canonico de la liga' })
  @ApiQuery({ name: 'equipo', required: false, description: 'UUID o nombre canonico del equipo' })
  @ApiQuery({ name: 'posicion', required: false, description: 'Codigo o nombre canonico de la posicion' })
  @ApiOkResponse({ type: ListaJugadoresResponseDto })
  @ApiBadRequestResponse({ description: 'Filtro invalido.' })
  listar(@Query() query: ListarJugadoresDto): Promise<ListaJugadoresResponseDto> {
    return this.catalogo.listar(query.validar()) as Promise<ListaJugadoresResponseDto>;
  }

  @Get(':id')
  @ApiOperation({ operationId: 'obtenerJugador', summary: 'Consultar el detalle de un jugador' })
  @ApiOkResponse({ type: JugadorResponseDto })
  @ApiBadRequestResponse({ description: 'Identificador invalido.' })
  @ApiNotFoundResponse({ description: 'Jugador inexistente o inactivo.' })
  obtener(@Param('id', new ValidationPipe({ transform: true })) id: string): Promise<JugadorResponseDto> {
    return this.catalogo.obtenerPorId(id);
  }
}
