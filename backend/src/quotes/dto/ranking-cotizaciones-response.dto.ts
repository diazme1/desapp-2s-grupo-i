import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { RankingCotizaciones } from '../quote-ranking.repository';

export class JugadorRankingCotizacionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Jugador' })
  nombre!: string;

  @ApiProperty({ example: 'Equipo' })
  equipo!: string;

  @ApiProperty({ example: 'PL' })
  liga!: string;

  @ApiProperty({ example: 82.5 })
  cotizacion!: number;
}

export class RankingCotizacionesResponseDto implements RankingCotizaciones {
  @ApiPropertyOptional({
    enum: ['ataque_decisivo', 'creacion_tecnica'],
    nullable: true,
  })
  estrategia!: 'ataque_decisivo' | 'creacion_tecnica' | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  idRecalculo!: string | null;

  @ApiPropertyOptional({ type: 'string', format: 'date-time', nullable: true })
  fechaHora!: Date | null;

  @ApiProperty({ type: () => [JugadorRankingCotizacionResponseDto] })
  jugadores!: JugadorRankingCotizacionResponseDto[];
}
