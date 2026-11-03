import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Creditos } from '../domain/creditos';
import { Cotizacion } from '../../quotes/domain/cotizacion';
import { OwnershipService } from '../../auth/ownership/ownership.service';
import { TransactionsResponseDto } from './dto/transactions-response.dto';
import {
  TRANSACTIONS_REPOSITORY,
  type TransactionsRepository,
} from './transactions.repository';

@Injectable()
export class TransactionsService {
  constructor(
    @Inject(TRANSACTIONS_REPOSITORY)
    private readonly transactions: TransactionsRepository,
    private readonly ownership: OwnershipService,
  ) {}

  async consultar(authenticatedUserId: string, requestedUserId: string) {
    this.ownership.assertOwner(authenticatedUserId, requestedUserId);
    const readModel = await this.transactions.consultar(requestedUserId);
    if (!readModel.usuarioExiste) {
      throw new NotFoundException('El usuario no existe.');
    }

    try {
      return TransactionsResponseDto.from(
        requestedUserId,
        readModel.operaciones.map((operation) => {
          const importe = Creditos.fromUnidades(operation.importeCreditos);
          return {
            ...operation,
            cotizacion: Cotizacion.fromDecimal(operation.cotizacion),
            importeCreditos: importe.toUnidades(),
          };
        }),
      );
    } catch (error) {
      if (error instanceof Error) {
        throw new ConflictException(
          `La operación persistida es inconsistente: ${error.message}`,
        );
      }
      throw error;
    }
  }
}
