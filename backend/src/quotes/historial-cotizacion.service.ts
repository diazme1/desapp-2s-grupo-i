import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ListarCotizacionesDto } from './dto/listar-cotizaciones.dto';
import { QUOTE_HISTORY_REPOSITORY } from './quotes.repository';
import type { QuoteHistoryRepository } from './quotes.repository';

@Injectable()
export class HistorialCotizacionService {
  constructor(
    @Inject(QUOTE_HISTORY_REPOSITORY)
    private readonly quotes: QuoteHistoryRepository,
  ) {}

  async listar(jugadorId: string, pagination: ListarCotizacionesDto) {
    const result = await this.quotes.listarHistorialJugador(
      jugadorId,
      pagination.page,
      pagination.limit,
    );
    if (!result)
      throw new NotFoundException('El jugador solicitado no existe.');

    return {
      ...result,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(result.total / pagination.limit),
    };
  }
}
