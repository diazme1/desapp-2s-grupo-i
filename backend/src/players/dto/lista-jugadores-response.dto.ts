import { ApiProperty } from '@nestjs/swagger';
import { JugadorResponseDto } from './jugador-response.dto';

export class ListaJugadoresResponseDto {
  @ApiProperty({ type: [JugadorResponseDto] })
  items!: JugadorResponseDto[];

  @ApiProperty({ example: 1, minimum: 0 })
  total!: number;
}
