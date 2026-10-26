import { ApiProperty } from '@nestjs/swagger';
import type { ResultadoRecalculoCotizaciones } from '../recalcular-cotizaciones.service';

export class RecalcularCotizacionesResponseDto
  implements ResultadoRecalculoCotizaciones
{
  @ApiProperty({ format: 'uuid' })
  idRecalculo!: string;

  @ApiProperty({ enum: ['ataque_decisivo', 'creacion_tecnica'] })
  estrategia!: 'ataque_decisivo' | 'creacion_tecnica';

  @ApiProperty({ enum: ['ataque_decisivo', 'creacion_tecnica'], isArray: true })
  estrategiasCalculadas!: ('ataque_decisivo' | 'creacion_tecnica')[];

  @ApiProperty({ example: 1 })
  versionEstrategia!: number;

  @ApiProperty({ format: 'date-time' })
  fechaHora!: Date;

  @ApiProperty({ example: 1287 })
  jugadoresCotizados!: number;

  @ApiProperty({ example: 13 })
  jugadoresSinEstadisticas!: number;
}
