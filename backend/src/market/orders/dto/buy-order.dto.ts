import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsUUID, Max, Min } from 'class-validator';

export class BuyOrderDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  idJugador!: string;

  @ApiProperty({ minimum: 1, maximum: 100, example: 3 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  cantidadTokens!: number;
}
