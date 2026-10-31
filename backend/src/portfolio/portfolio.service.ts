import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OwnershipService } from '../auth/ownership/ownership.service';
import { Portfolio, PortfolioDomainError } from './domain/portfolio';
import { PortfolioResponseDto } from './dto/portfolio-response.dto';
import {
  PORTFOLIO_REPOSITORY,
  type PortfolioRepository,
} from './portfolio.repository';

@Injectable()
export class PortfolioService {
  constructor(
    @Inject(PORTFOLIO_REPOSITORY)
    private readonly portfolio: PortfolioRepository,
    private readonly ownership: OwnershipService,
  ) {}

  async consultar(authenticatedUserId: string, requestedUserId: string) {
    this.ownership.assertOwner(authenticatedUserId, requestedUserId);
    const readModel = await this.portfolio.consultar(requestedUserId);
    if (!readModel.usuarioExiste) {
      throw new NotFoundException('El usuario no existe.');
    }

    try {
      return PortfolioResponseDto.from(
        requestedUserId,
        Portfolio.calcular(readModel),
      );
    } catch (error) {
      if (error instanceof PortfolioDomainError) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }
}
