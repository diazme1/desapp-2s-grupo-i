import { ApiProperty } from '@nestjs/swagger';

export class BuyOrderResponseDto {
  @ApiProperty({ format: 'uuid' }) idOperacion!: string;
  @ApiProperty({ format: 'uuid' }) idJugador!: string;
  @ApiProperty({ format: 'uuid' }) idComprador!: string;
  @ApiProperty({ format: 'uuid' }) idVendedor!: string;
  @ApiProperty() cantidadTokens!: number;
  @ApiProperty({ example: '12.34', type: String }) cotizacion!: string;
  @ApiProperty({ example: '37.02', type: String }) importe!: string;
  @ApiProperty() estrategia!: string;
  @ApiProperty({ format: 'uuid' }) idVersionEstrategia!: string;
  @ApiProperty({ format: 'date-time' }) fechaHora!: Date;
  @ApiProperty() idempotencyKey!: string;
}
