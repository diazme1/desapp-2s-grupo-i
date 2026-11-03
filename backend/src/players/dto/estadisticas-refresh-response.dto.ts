import { ApiProperty } from '@nestjs/swagger';
import type { EstadoEstadisticasRefresh } from '../actualizar-catalogo.service';
import { MOTIVOS_SIN_MATCH, type MotivoSinMatch } from '../estadisticas-jugador.service';

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

  @ApiProperty({
    enum: MOTIVOS_SIN_MATCH,
    nullable: true,
    example: 'sin_match_equipo',
    description:
      'Motivo agregado de las estadísticas no asociadas. Vale null cuando no hubo fallos de matching.',
  })
  motivoSinMatch!: MotivoSinMatch | null;
}
