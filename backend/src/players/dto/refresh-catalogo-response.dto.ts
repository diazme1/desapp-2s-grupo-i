import { ApiProperty } from '@nestjs/swagger';
import { EstadisticasRefreshResponseDto } from './estadisticas-refresh-response.dto';

export class RefreshCatalogoResponseDto {
  @ApiProperty({ example: 'Football-Data.org' })
  fuente!: string;

  @ApiProperty({ example: 5 })
  ligas!: number;

  @ApiProperty({ example: 100 })
  equipos!: number;

  @ApiProperty({ example: 2500 })
  jugadores!: number;

  @ApiProperty({ example: 126345, description: 'Tiempo de extracción desde Football-Data.org, en milisegundos.' })
  tiempoExtraccionMs!: number;

  @ApiProperty({ example: '126.35 s', description: 'Tiempo de extracción desde Football-Data.org, en formato legible.' })
  tiempoExtraccion!: string;

  @ApiProperty({ example: '2026-09-22T12:00:00.000Z' })
  actualizadoEn!: string;

  @ApiProperty({ type: EstadisticasRefreshResponseDto })
  estadisticas!: EstadisticasRefreshResponseDto;
}
