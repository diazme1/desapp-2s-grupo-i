import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EquipoResumenDto, JugadorResponseDto, LigaResumenDto } from './dto/jugador-response.dto';
import { Jugador } from './domain/jugador';
import { esUuid } from './domain/validar-uuid';
import { JUGADOR_REPOSITORY } from './players.repository';
import type { FiltrosJugadores, JugadorRepository } from './players.repository';

export interface ListaJugadoresPublica {
  items: JugadorResponseDto[];
  total: number;
}

@Injectable()
export class CatalogoJugadoresService {
  constructor(@Inject(JUGADOR_REPOSITORY) private readonly jugadores: JugadorRepository) {}

  async listar(filtros: FiltrosJugadores): Promise<ListaJugadoresPublica> {
    const normalizados = this.normalizarFiltros(filtros);
    const resultado = await this.jugadores.listar({ ...normalizados, activo: true });
    return {
      items: resultado.items.map((jugador) => this.toResponse(jugador)),
      total: resultado.total,
    };
  }

  async obtenerPorId(id: string): Promise<JugadorResponseDto> {
    if (!esUuid(id)) throw new BadRequestException('El identificador del jugador no es válido.');
    const jugador = await this.jugadores.buscarActivoPorId(id);
    if (!jugador) throw new NotFoundException('El jugador no existe.');
    return this.toResponse(jugador);
  }

  private normalizarFiltros(filtros: FiltrosJugadores): FiltrosJugadores {
    const normalizados: FiltrosJugadores = {};
    for (const [campo, value] of Object.entries(filtros)) {
      if (campo === 'activo' || value === undefined) continue;
      if (typeof value !== 'string' || !value.trim() || value.trim().length > 100) {
        throw new BadRequestException(`El filtro ${campo} no es válido.`);
      }
      const campoFiltro = campo as 'liga' | 'equipo' | 'posicion';
      normalizados[campoFiltro] = value.trim().toLocaleLowerCase('es');
    }
    return normalizados;
  }

  private toResponse(jugador: Jugador): JugadorResponseDto {
    return {
      id: jugador.id,
      nombre: jugador.nombre,
      posicion: jugador.posicion,
      equipo: {
        id: jugador.equipo.id,
        nombre: jugador.equipo.nombre,
      } as EquipoResumenDto,
      liga: {
        id: jugador.liga.id,
        codigo: jugador.liga.codigo,
        nombre: jugador.liga.nombre,
      } as LigaResumenDto,
      activo: jugador.activo,
      actualizadoEn: jugador.actualizadoEn,
    };
  }
}
