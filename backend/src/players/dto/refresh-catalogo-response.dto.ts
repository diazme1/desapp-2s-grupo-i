import { ApiProperty } from '@nestjs/swagger';

export class RefreshCatalogoResponseDto {
  @ApiProperty({ example: 'Football-Data.org' })
  fuente!: string;

  @ApiProperty({ example: 5 })
  ligas!: number;

  @ApiProperty({ example: 100 })
  equipos!: number;

  @ApiProperty({ example: 2500 })
  jugadores!: number;

  @ApiProperty({ example: '2026-09-22T12:00:00.000Z' })
  actualizadoEn!: string;
}
