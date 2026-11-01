import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsDefined,
  IsInt,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { TIPOS_ESTRATEGIA_COTIZACION } from '../../players/domain/estrategia-cotizacion';
import type { TipoEstrategiaCotizacion } from '../../players/domain/estrategia-cotizacion';

const tiposEstrategia = Object.values(TIPOS_ESTRATEGIA_COTIZACION);

export class PesosEstrategiaCotizacionDto {
  @ApiProperty({ minimum: 0, maximum: 100, example: 35 })
  @IsInt()
  @Min(0)
  @Max(100)
  goles!: number;

  @ApiProperty({ minimum: 0, maximum: 100, example: 25 })
  @IsInt()
  @Min(0)
  @Max(100)
  asistencias!: number;

  @ApiProperty({ minimum: 0, maximum: 100, example: 20 })
  @IsInt()
  @Min(0)
  @Max(100)
  tiros!: number;

  @ApiProperty({ minimum: 0, maximum: 100, example: 5 })
  @IsInt()
  @Min(0)
  @Max(100)
  pasesClave!: number;

  @ApiProperty({ minimum: 0, maximum: 100, example: 5 })
  @IsInt()
  @Min(0)
  @Max(100)
  regates!: number;

  @ApiProperty({ minimum: 0, maximum: 100, example: 5 })
  @IsInt()
  @Min(0)
  @Max(100)
  rating!: number;

  @ApiProperty({ minimum: 0, maximum: 100, example: 5, description: 'Magnitud del peso; esta métrica resta al score.' })
  @IsInt()
  @Min(0)
  @Max(100)
  faltasCometidas!: number;
}

export class PesosEstrategiasCotizacionDto {
  @ApiProperty({ type: PesosEstrategiaCotizacionDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => PesosEstrategiaCotizacionDto)
  ataque_decisivo!: PesosEstrategiaCotizacionDto;

  @ApiProperty({ type: PesosEstrategiaCotizacionDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => PesosEstrategiaCotizacionDto)
  creacion_tecnica!: PesosEstrategiaCotizacionDto;
}

export class RecalcularCotizacionesDto {
  @ApiProperty({
    enum: tiposEstrategia,
    example: TIPOS_ESTRATEGIA_COTIZACION.ATAQUE_DECISIVO,
    description: 'Estrategia que quedará activa para las operaciones de compra y venta.',
  })
  @IsIn(tiposEstrategia)
  estrategia!: TipoEstrategiaCotizacion;

  @ApiProperty({ type: PesosEstrategiasCotizacionDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => PesosEstrategiasCotizacionDto)
  pesosEstrategias?: PesosEstrategiasCotizacionDto;
}
