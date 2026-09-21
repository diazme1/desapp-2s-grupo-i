import { ApiProperty } from '@nestjs/swagger';

export class EquipoResumenDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Arsenal' })
  nombre!: string;
}

export class LigaResumenDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'premier-league' })
  codigo!: string;

  @ApiProperty({ example: 'Premier League' })
  nombre!: string;
}

export class JugadorResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Bukayo Saka' })
  nombre!: string;

  @ApiProperty({ example: 'extremo' })
  posicion!: string;

  @ApiProperty({ type: EquipoResumenDto })
  equipo!: EquipoResumenDto;

  @ApiProperty({ type: LigaResumenDto })
  liga!: LigaResumenDto;

  @ApiProperty({ example: true })
  activo!: boolean;

  @ApiProperty({ format: 'date-time' })
  actualizadoEn!: Date;
}
