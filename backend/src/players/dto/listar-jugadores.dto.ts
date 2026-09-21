import { Transform } from 'class-transformer';
import { Allow, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BadRequestException } from '@nestjs/common';

function trimValue(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class ListarJugadoresDto {
  @ApiPropertyOptional({ description: 'UUID o codigo canonico de la liga', example: 'premier-league' })
  @Allow()
  @IsOptional()
  @Transform(({ value }) => trimValue(value))
  liga?: unknown;

  @ApiPropertyOptional({ description: 'UUID o nombre canonico del equipo', example: 'Arsenal' })
  @Allow()
  @IsOptional()
  @Transform(({ value }) => trimValue(value))
  equipo?: unknown;

  @ApiPropertyOptional({ description: 'Codigo o nombre canonico de la posicion', example: 'delantero' })
  @Allow()
  @IsOptional()
  @Transform(({ value }) => trimValue(value))
  posicion?: unknown;

  validar(): { liga?: string; equipo?: string; posicion?: string } {
    const filtros = {
      liga: this.validarCampo(this.liga, 'liga'),
      equipo: this.validarCampo(this.equipo, 'equipo'),
      posicion: this.validarCampo(this.posicion, 'posicion'),
    };
    return Object.fromEntries(Object.entries(filtros).filter(([, value]) => value !== undefined)) as {
      liga?: string;
      equipo?: string;
      posicion?: string;
    };
  }

  private validarCampo(value: unknown, campo: string): string | undefined {
    if (value === undefined) return undefined;
    if (typeof value !== 'string' || !value.trim() || value.trim().length > 100) {
      throw new BadRequestException(`El filtro ${campo} no es válido.`);
    }
    return value.trim();
  }
}
