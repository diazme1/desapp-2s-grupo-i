import { ApiProperty } from '@nestjs/swagger';
import type {
  ConfiguracionEstrategiaCotizacion,
} from '../recalcular-cotizaciones.service';
import { PesosEstrategiaCotizacionDto } from './recalcular-cotizaciones.dto';

export class ConfiguracionEstrategiaCotizacionResponseDto
  implements ConfiguracionEstrategiaCotizacion
{
  @ApiProperty({ enum: ['ataque_decisivo', 'creacion_tecnica'] })
  tipoEstrategia!: 'ataque_decisivo' | 'creacion_tecnica';

  @ApiProperty({ example: 2 })
  numeroVersion!: number;

  @ApiProperty({ example: true, description: 'Indica si la versión ya está guardada en la base de datos.' })
  persistida!: boolean;

  @ApiProperty({ type: PesosEstrategiaCotizacionDto })
  pesos!: PesosEstrategiaCotizacionDto;
}

export class EstrategiasCotizacionResponseDto {
  @ApiProperty({ type: [ConfiguracionEstrategiaCotizacionResponseDto] })
  estrategias!: ConfiguracionEstrategiaCotizacionResponseDto[];
}
