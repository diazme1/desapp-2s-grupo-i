import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ListarJugadoresDto } from './dto/listar-jugadores.dto';
import { PLAYERS_REPOSITORY } from './players.repository';
import type { PlayersRepository } from './players.repository';

@Injectable()
export class CatalogoJugadoresService {
  constructor(@Inject(PLAYERS_REPOSITORY) private readonly players: PlayersRepository) {}

  listar(input: ListarJugadoresDto) {
    return this.players.listar(input.ligaCodigo);
  }

  async buscarPorId(id: string) {
    const jugador = await this.players.buscarPorId(id);
    if (!jugador) throw new NotFoundException('El jugador solicitado no existe.');
    return jugador;
  }
}
