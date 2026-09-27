import { ApiProperty } from '@nestjs/swagger';
import { Equipo } from '../domain/equipo';
import { Liga } from '../domain/liga';
import { JugadorConRelaciones } from '../players.repository';

export class LigaResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'PL' })
  codigo!: string;

  @ApiProperty({ example: 'Premier League' })
  nombre!: string;

  @ApiProperty({ nullable: true, required: false, example: 'England' })
  pais!: string | null;

  @ApiProperty({ nullable: true, required: false })
  emblemaUrl!: string | null;

  static from(liga: Liga): LigaResponseDto {
    const dto = new LigaResponseDto();
    dto.id = liga.id;
    dto.codigo = liga.codigo;
    dto.nombre = liga.nombre;
    dto.pais = liga.pais;
    dto.emblemaUrl = liga.emblemaUrl;
    return dto;
  }
}

export class EquipoResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Manchester City FC' })
  nombre!: string;

  @ApiProperty({ nullable: true, required: false })
  nombreCorto!: string | null;

  @ApiProperty({ nullable: true, required: false, example: 'MCI' })
  sigla!: string | null;

  @ApiProperty({ nullable: true, required: false })
  escudoUrl!: string | null;

  static from(equipo: Equipo): EquipoResponseDto {
    const dto = new EquipoResponseDto();
    dto.id = equipo.id;
    dto.nombre = equipo.nombre;
    dto.nombreCorto = equipo.nombreCorto;
    dto.sigla = equipo.sigla;
    dto.escudoUrl = equipo.escudoUrl;
    return dto;
  }
}

export class JugadorResponseDto {
  @ApiProperty({ format: 'uuid', description: 'Identificador interno estable.' })
  id!: string;

  @ApiProperty({ example: 'John Doe' })
  nombre!: string;

  @ApiProperty({ nullable: true, required: false })
  nombreCompleto!: string | null;

  @ApiProperty({ nullable: true, required: false, example: 'Midfielder' })
  posicion!: string | null;

  @ApiProperty({ nullable: true, required: false, example: '1995-02-05' })
  fechaNacimiento!: string | null;

  @ApiProperty({ nullable: true, required: false, example: 'Argentina' })
  nacionalidad!: string | null;

  @ApiProperty({ type: () => EquipoResponseDto })
  equipo!: EquipoResponseDto;

  @ApiProperty({ type: () => LigaResponseDto })
  liga!: LigaResponseDto;

  static from(record: JugadorConRelaciones): JugadorResponseDto {
    const dto = new JugadorResponseDto();
    dto.id = record.jugador.id;
    dto.nombre = record.jugador.nombre;
    dto.nombreCompleto = record.jugador.nombreCompleto;
    dto.posicion = record.jugador.posicion;
    dto.fechaNacimiento = record.jugador.fechaNacimiento;
    dto.nacionalidad = record.jugador.nacionalidad;
    dto.equipo = EquipoResponseDto.from(record.equipo);
    dto.liga = LigaResponseDto.from(record.liga);
    return dto;
  }
}
