import { ApiProperty } from '@nestjs/swagger';
import type { EstadoEstadisticasRefresh } from '../actualizar-catalogo.service';

export class EstadisticasRefreshResponseDto {
  @ApiProperty({ enum: ['completo', 'parcial', 'sin_estadisticas'], example: 'completo' })
  estado!: EstadoEstadisticasRefresh;

  @ApiProperty({ example: 2500 })
  procesados!: number;

  @ApiProperty({ example: 2400 })
  exitosos!: number;

  @ApiProperty({ example: 50 })
  parciales!: number;

  @ApiProperty({ example: 50 })
  fallidos!: number;
}
