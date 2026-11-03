import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { DATABASE_DATA_SOURCE, DatabaseModule } from '../database/database.module';
import { QuotesModule } from '../quotes/quotes.module';
import { OrdersModule } from './orders/orders.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { TransactionsModule } from './transactions/transactions.module';
import { MarketInitializationService } from './market-initialization.service';
import { MARKET_REPOSITORY } from './market.repository';
import { TypeOrmMarketRepository } from './persistence/typeorm-market.repository';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    DatabaseModule,
    QuotesModule,
    OrdersModule,
    PortfolioModule,
    TransactionsModule,
  ],
  providers: [
    {
      provide: MARKET_REPOSITORY,
      inject: [DATABASE_DATA_SOURCE],
      useFactory: (dataSource: import('typeorm').DataSource) =>
        new TypeOrmMarketRepository(dataSource),
    },
    MarketInitializationService,
  ],
})
export class MarketModule {}
