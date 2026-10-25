import type { TipoEstrategiaCotizacion } from '../players/domain/estrategia-cotizacion';

export const QUOTE_RANKING_REPOSITORY = Symbol('QUOTE_RANKING_REPOSITORY');

export interface JugadorRankingCotizacion {
  id: string;
  nombre: string;
  equipo: string;
  liga: string;
  cotizacion: number;
}

export interface RankingCotizaciones {
  estrategia: TipoEstrategiaCotizacion | null;
  idRecalculo: string | null;
  fechaHora: Date | null;
  jugadores: JugadorRankingCotizacion[];
}

export interface QuoteRankingRepository {
  listarRanking(
    estrategia?: TipoEstrategiaCotizacion,
  ): Promise<RankingCotizaciones>;
}
