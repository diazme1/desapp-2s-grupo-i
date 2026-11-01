import { ApiProperty } from '@nestjs/swagger';
import { Creditos } from '../../market/domain/creditos';
import type { PublicTransactionSnapshot } from '../transactions.repository';

export class TransactionResponseDto {
  @ApiProperty({ format: 'uuid' })
  idOperacion!: string;

  @ApiProperty({ enum: ['COMPRA', 'VENTA'] })
  tipo!: 'COMPRA' | 'VENTA';

  @ApiProperty({ format: 'uuid' })
  idJugador!: string;

  @ApiProperty({ example: 'Lionel Andrés Messi', nullable: true })
  nombreCompleto!: string | null;

  @ApiProperty({ example: 2, minimum: 1 })
  cantidadTokens!: number;

  @ApiProperty({ example: '15.00', type: String })
  cotizacion!: string;

  @ApiProperty({ example: '30.00', type: String })
  importe!: string;

  @ApiProperty({ format: 'date-time' })
  fechaHora!: Date;

  static from(operation: PublicTransactionSnapshot): TransactionResponseDto {
    const dto = new TransactionResponseDto();
    dto.idOperacion = operation.idOperacion;
    dto.tipo = operation.tipo;
    dto.idJugador = operation.jugadorId;
    dto.nombreCompleto = operation.nombreCompleto;
    dto.cantidadTokens = operation.cantidadTokens;
    dto.cotizacion = operation.cotizacion.toDecimalString();
    dto.importe = Creditos.fromUnidades(
      operation.importeCreditos,
    ).toDecimalString();
    dto.fechaHora = operation.fechaHora;
    return dto;
  }
}

export class TransactionsResponseDto {
  @ApiProperty({ format: 'uuid' })
  usuarioId!: string;

  @ApiProperty({ type: () => [TransactionResponseDto] })
  operaciones!: TransactionResponseDto[];

  static from(
    usuarioId: string,
    operations: PublicTransactionSnapshot[],
  ): TransactionsResponseDto {
    const dto = new TransactionsResponseDto();
    dto.usuarioId = usuarioId;
    dto.operaciones = operations.map(TransactionResponseDto.from);
    return dto;
  }
}
