import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { PLAYERS_DATA_SOURCE, PlayersModule } from '../players/players.module';
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
    PlayersModule,
    OrdersModule,
    PortfolioModule,
    TransactionsModule,
  ],
  providers: [
    {
      provide: MARKET_REPOSITORY,
      inject: [PLAYERS_DATA_SOURCE],
      useFactory: (dataSource: import('typeorm').DataSource) =>
        new TypeOrmMarketRepository(dataSource),
    },
    MarketInitializationService,
  ],
})
export class MarketModule {}
