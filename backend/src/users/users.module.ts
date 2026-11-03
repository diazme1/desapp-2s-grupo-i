import { Module } from '@nestjs/common';
import { DATABASE_DATA_SOURCE, DatabaseModule } from '../database/database.module';
import { USER_REPOSITORY } from './users.repository';
import { TypeOrmUserRepository } from './persistence/typeorm-user.repository';

@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: USER_REPOSITORY,
      inject: [DATABASE_DATA_SOURCE],
      useFactory: (dataSource: import('typeorm').DataSource) =>
        new TypeOrmUserRepository(dataSource),
    },
  ],
  exports: [USER_REPOSITORY],
})
export class UsersModule {}
