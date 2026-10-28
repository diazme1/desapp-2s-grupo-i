import { ApiProperty } from '@nestjs/swagger';
import { QuoteHistoryItem } from '../quotes.repository';
import { Cotizacion } from '../../market/domain/cotizacion';

export class CotizacionHistorialItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  idJugador!: string;

  @ApiProperty({ format: 'date-time' })
  fechaHora!: Date;

  @ApiProperty({
    example: 82.5,
    description: 'Número JSON de presentación; no se utiliza para cálculos financieros.',
  })
  cotizacion!: number;

  @ApiProperty({ example: 'ataque_decisivo' })
  tipoEstrategia!: string;

  @ApiProperty({ format: 'uuid' })
  idVersionEstrategia!: string;

  @ApiProperty({ format: 'uuid', nullable: true })
  idRecalculo!: string | null;

  @ApiProperty({ format: 'uuid', nullable: true })
  idEstadistica!: string | null;

  static from(item: QuoteHistoryItem): CotizacionHistorialItemResponseDto {
    const dto = new CotizacionHistorialItemResponseDto();
    dto.id = item.id;
    dto.idJugador = item.jugadorId;
    dto.fechaHora = item.fechaHora;
    dto.cotizacion =
      item.cotizacion instanceof Cotizacion
        ? parseFloat(item.cotizacion.toDecimalString())
        : item.cotizacion;
    dto.tipoEstrategia = item.tipoEstrategia;
    dto.idVersionEstrategia = item.idVersionEstrategia;
    dto.idRecalculo = item.idRecalculo;
    dto.idEstadistica = item.idEstadistica;
    return dto;
  }
}

export class HistorialCotizacionResponseDto {
  @ApiProperty({ type: () => [CotizacionHistorialItemResponseDto] })
  items!: CotizacionHistorialItemResponseDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 47 })
  total!: number;

  @ApiProperty({ example: 3 })
  totalPages!: number;

  static from(result: {
    items: QuoteHistoryItem[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }): HistorialCotizacionResponseDto {
    const dto = new HistorialCotizacionResponseDto();
    dto.items = result.items.map(CotizacionHistorialItemResponseDto.from);
    dto.page = result.page;
    dto.limit = result.limit;
    dto.total = result.total;
    dto.totalPages = result.totalPages;
    return dto;
  }
}
