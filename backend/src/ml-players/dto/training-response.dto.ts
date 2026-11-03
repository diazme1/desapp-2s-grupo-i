import { ApiProperty } from '@nestjs/swagger';

export class TrainingResponseDto {
  @ApiProperty({ example: 'entrenado' }) estado!: string;
  @ApiProperty({ example: 'model-20261102153000-a1b2c3d4' }) versionModelo!: string;
  @ApiProperty({ example: 'dataset-a1b2c3d4e5f6' }) versionDataset!: string;
  @ApiProperty({ example: 'statistics-normalization-v1' }) versionTransformaciones!: string;
  @ApiProperty({ example: 'whoscored' }) origenDatos!: string;
  @ApiProperty({ example: 120 }) cantidadSnapshots!: number;
  @ApiProperty({ example: 84 }) cantidadEjemplos!: number;
  @ApiProperty({ type: 'object', additionalProperties: true }) metricas!: Record<string, unknown>;
}
