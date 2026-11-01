import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { PlayersModule, PLAYERS_DATA_SOURCE } from '../../players/players.module';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { TRANSACTIONS_REPOSITORY } from './transactions.repository';
import { TypeOrmTransactionsRepository } from './persistence/typeorm-transactions.repository';

@Module({
  imports: [AuthModule, PlayersModule],
  controllers: [TransactionsController],
  providers: [
    {
      provide: TRANSACTIONS_REPOSITORY,
      inject: [PLAYERS_DATA_SOURCE],
      useFactory: (dataSource: import('typeorm').DataSource) =>
        new TypeOrmTransactionsRepository(dataSource),
    },
    TransactionsService,
  ],
})
export class TransactionsModule {}
