import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PredictionResponseDto {
  @ApiProperty({ enum: ['disponible', 'no_disponible'] }) estado!: string;
  @ApiProperty({ nullable: true, example: '18.25' }) cotizacionActual!: string | null;
  @ApiProperty({ nullable: true, example: '21.40' }) cotizacionPredicha!: string | null;
  @ApiProperty() prediccionDisponible!: boolean;
  @ApiProperty({ format: 'date-time' }) fechaGeneracion!: string;
  @ApiProperty({ format: 'date' }) fechaObjetivo!: string;
  @ApiProperty({ nullable: true }) versionModelo!: string | null;
  @ApiProperty({ nullable: true }) versionEstrategia!: string | null;
  @ApiProperty({ type: [String] }) origenDatos!: string[];
  @ApiPropertyOptional({ type: 'object', additionalProperties: true }) estadisticasPredichas?: Record<string, string> | null;
  @ApiPropertyOptional() mensaje?: string;
}
