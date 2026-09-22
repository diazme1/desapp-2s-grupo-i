import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnvironment } from './config/environment';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';

@Module({})
export class AppModule {
  static register(envFilePath = '.env'): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath,
          validate: validateEnvironment,
        }),
        HealthModule,
        AuthModule,
      ],
    };
  }
}
