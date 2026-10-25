import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { TIPOS_ESTRATEGIA_COTIZACION } from '../../players/domain/estrategia-cotizacion';
import type { TipoEstrategiaCotizacion } from '../../players/domain/estrategia-cotizacion';

const tiposEstrategia = Object.values(TIPOS_ESTRATEGIA_COTIZACION);

export class RecalcularCotizacionesDto {
  @ApiProperty({
    enum: tiposEstrategia,
    example: TIPOS_ESTRATEGIA_COTIZACION.ATAQUE_DECISIVO,
    description: 'Estrategia v1 que se aplicará a las estadísticas guardadas.',
  })
  @IsIn(tiposEstrategia)
  estrategia!: TipoEstrategiaCotizacion;
}
