import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { TIPOS_ESTRATEGIA_COTIZACION } from '../../players/domain/estrategia-cotizacion';

export class ListarRankingDto {
  @ApiPropertyOptional({
    enum: Object.values(TIPOS_ESTRATEGIA_COTIZACION),
    description:
      'Estrategia a consultar. Si se omite, se usa la estrategia activa.',
  })
  @IsOptional()
  @IsEnum(TIPOS_ESTRATEGIA_COTIZACION)
  estrategia?: (typeof TIPOS_ESTRATEGIA_COTIZACION)[keyof typeof TIPOS_ESTRATEGIA_COTIZACION];
}
