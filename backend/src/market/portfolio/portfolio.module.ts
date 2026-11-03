import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { DATABASE_DATA_SOURCE, DatabaseModule } from '../../database/database.module';
import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from './portfolio.service';
import { PORTFOLIO_REPOSITORY } from './portfolio.repository';
import { TypeOrmPortfolioRepository } from './persistence/typeorm-portfolio.repository';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [PortfolioController],
  providers: [
    {
      provide: PORTFOLIO_REPOSITORY,
      inject: [DATABASE_DATA_SOURCE],
      useFactory: (dataSource: import('typeorm').DataSource) =>
        new TypeOrmPortfolioRepository(dataSource),
    },
    PortfolioService,
  ],
})
export class PortfolioModule {}
