import { ApiProperty } from '@nestjs/swagger';
import type { PosicionPortfolioCalculada } from '../domain/portfolio';

export class PortfolioPositionResponseDto {
  @ApiProperty({ format: 'uuid' })
  idJugador!: string;

  @ApiProperty({ example: 2, minimum: 1 })
  cantidadTokens!: number;

  @ApiProperty({ example: '15.00', type: String })
  cotizacionVigente!: string;

  @ApiProperty({ example: '11.00', type: String, nullable: true })
  precioPromedioCompra!: string | null;

  @ApiProperty({ example: '30.00', type: String })
  valorActual!: string;

  @ApiProperty({ example: '8.00', type: String, nullable: true })
  gananciaPerdida!: string | null;

  static from(
    position: PosicionPortfolioCalculada,
  ): PortfolioPositionResponseDto {
    const dto = new PortfolioPositionResponseDto();
    dto.idJugador = position.idJugador;
    dto.cantidadTokens = position.cantidadTokens;
    dto.cotizacionVigente = position.cotizacionVigente.toDecimalString();
    dto.precioPromedioCompra =
      position.precioPromedioCompra?.toDecimalStringHalfUp() ?? null;
    dto.valorActual = position.valorActual.toDecimalStringHalfUp();
    dto.gananciaPerdida =
      position.gananciaPerdida?.toDecimalStringHalfUp() ?? null;
    return dto;
  }
}

export class PortfolioResponseDto {
  @ApiProperty({ format: 'uuid' })
  usuarioId!: string;

  @ApiProperty({ type: () => [PortfolioPositionResponseDto] })
  posiciones!: PortfolioPositionResponseDto[];

  static from(
    usuarioId: string,
    positions: PosicionPortfolioCalculada[],
  ): PortfolioResponseDto {
    const dto = new PortfolioResponseDto();
    dto.usuarioId = usuarioId;
    dto.posiciones = positions.map(PortfolioPositionResponseDto.from);
    return dto;
  }
}
