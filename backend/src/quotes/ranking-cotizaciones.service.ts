import { Inject, Injectable } from '@nestjs/common';
import type { TipoEstrategiaCotizacion } from '../players/domain/estrategia-cotizacion';
import {
  QUOTE_RANKING_REPOSITORY,
  type QuoteRankingRepository,
} from './quote-ranking.repository';

@Injectable()
export class RankingCotizacionesService {
  constructor(
    @Inject(QUOTE_RANKING_REPOSITORY)
    private readonly ranking: QuoteRankingRepository,
  ) {}

  listar(estrategia?: TipoEstrategiaCotizacion) {
    return this.ranking.listarRanking(estrategia);
  }
}
