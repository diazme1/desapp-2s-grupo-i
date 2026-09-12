import { ConfigService } from '@nestjs/config';
import { Module } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { USER_REPOSITORY } from './users.repository';
import { InMemoryUserRepository } from './persistence/in-memory-user.repository';
import { TypeOrmUserRepository } from './persistence/typeorm-user.repository';
import { UserEntity } from './persistence/user.entity';

@Module({
  providers: [
    {
      provide: USER_REPOSITORY,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const url = config.get<string>('DATABASE_URL');
        if (!url) return new InMemoryUserRepository();
        const dataSource = new DataSource({
          type: 'postgres',
          url,
          entities: [UserEntity],
          synchronize: false,
        });
        await dataSource.initialize();
        return new TypeOrmUserRepository(dataSource);
      },
    },
  ],
  exports: [USER_REPOSITORY],
})
export class UsersModule {}
