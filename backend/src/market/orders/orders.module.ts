import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { DATABASE_DATA_SOURCE, DatabaseModule } from '../../database/database.module';
import { OrdersController } from './orders.controller';
import { ORDERS_REPOSITORY } from './orders.repository';
import { OrdersService } from './orders.service';
import { TypeOrmOrdersRepository } from './persistence/typeorm-orders.repository';
import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from './portfolio.service';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [OrdersController, PortfolioController],
  providers: [
    {
      provide: ORDERS_REPOSITORY,
      inject: [DATABASE_DATA_SOURCE],
      useFactory: (dataSource: import('typeorm').DataSource) =>
        new TypeOrmOrdersRepository(dataSource),
    },
    OrdersService,
    PortfolioService,
  ],
})
export class OrdersModule {}
