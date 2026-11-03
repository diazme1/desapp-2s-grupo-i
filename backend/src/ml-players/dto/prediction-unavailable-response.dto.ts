import { ApiProperty } from '@nestjs/swagger';

export class PredictionUnavailableResponseDto {
  @ApiProperty({ example: 'no_disponible' }) estado!: 'no_disponible';
  @ApiProperty({ nullable: true, example: '18.25' }) cotizacionActual!: string | null;
  @ApiProperty({ nullable: true, example: null }) cotizacionPredicha!: null;
  @ApiProperty({ example: false }) prediccionDisponible!: false;
  @ApiProperty() mensaje!: string;
}
