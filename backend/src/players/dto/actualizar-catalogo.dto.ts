import { Transform } from 'class-transformer';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ActualizarCatalogoDto {
  @ApiPropertyOptional({
    description: 'Código de la única liga a actualizar. Si se omite, usa la configuración del entorno.',
    example: 'PL',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @MaxLength(5)
  @Matches(/^[A-Z0-9]+$/, { message: 'ligaCodigo debe ser un código alfanumérico válido.' })
  ligaCodigo?: string;
}
