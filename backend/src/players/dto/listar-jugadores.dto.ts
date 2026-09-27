import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListarJugadoresDto {
  @ApiPropertyOptional({ description: 'Código de liga, por ejemplo PL.', example: 'PL' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @MaxLength(20)
  ligaCodigo?: string;
}
