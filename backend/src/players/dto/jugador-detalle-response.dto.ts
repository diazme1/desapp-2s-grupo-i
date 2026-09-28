import { ApiProperty } from '@nestjs/swagger';
import { EstadisticasJugador } from '../domain/estadisticas-jugador';
import { JugadorConEstadisticas } from '../players.repository';
import { JugadorResponseDto } from './jugador-response.dto';

export class EstadisticasJugadorResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ nullable: true, example: 12 })
  goles!: number | null;

  @ApiProperty({ nullable: true, example: 8 })
  asistencias!: number | null;

  @ApiProperty({ nullable: true, example: 2.45 })
  tiros!: number | null;

  @ApiProperty({ nullable: true, example: 1.2 })
  pasesClave!: number | null;

  @ApiProperty({ nullable: true, example: 3.1 })
  regates!: number | null;

  @ApiProperty({ nullable: true, example: 0.8 })
  faltasCometidas!: number | null;

  @ApiProperty({ nullable: true, example: 7.4 })
  ratingWhoScored!: number | null;

  static from(estadisticas: EstadisticasJugador): EstadisticasJugadorResponseDto {
    const dto = new EstadisticasJugadorResponseDto();
    dto.id = estadisticas.idEstadistica;
    dto.goles = estadisticas.goles;
    dto.asistencias = estadisticas.asistencias;
    dto.tiros = estadisticas.tiros;
    dto.pasesClave = estadisticas.pasesClave;
    dto.regates = estadisticas.regates;
    dto.faltasCometidas = estadisticas.faltasCometidas;
    dto.ratingWhoScored = estadisticas.ratingWhoScored;
    return dto;
  }
}

export class JugadorDetalleResponseDto extends JugadorResponseDto {
  @ApiProperty({ type: () => [EstadisticasJugadorResponseDto] })
  estadisticas!: EstadisticasJugadorResponseDto[];

  static from(record: JugadorConEstadisticas): JugadorDetalleResponseDto {
    const base = JugadorResponseDto.from(record);
    const dto = Object.assign(new JugadorDetalleResponseDto(), base);
    dto.estadisticas = record.estadisticas.map(EstadisticasJugadorResponseDto.from);
    return dto;
  }
}
