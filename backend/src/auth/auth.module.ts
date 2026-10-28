import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { BcryptPasswordHasher } from './strategies/password-hasher';
import { JwtTokenService } from './strategies/jwt-token.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SuperadminGuard } from './guards/superadmin.guard';
import {
  CATALOG_REFRESH_API_KEY_CONFIG,
  CatalogRefreshApiKeyGuard,
} from './guards/catalog-refresh-api-key.guard';
import { OwnershipService } from './ownership/ownership.service';
import { SuperadminBootstrapService } from './superadmin-bootstrap.service';

@Module({
  imports: [UsersModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    SuperadminBootstrapService,
    BcryptPasswordHasher,
    JwtTokenService,
    JwtAuthGuard,
    SuperadminGuard,
    CatalogRefreshApiKeyGuard,
    {
      provide: CATALOG_REFRESH_API_KEY_CONFIG,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.getOrThrow<string>('CATALOG_REFRESH_API_KEY'),
    },
    OwnershipService,
  ],
  exports: [
    AuthService,
    JwtAuthGuard,
    SuperadminGuard,
    CatalogRefreshApiKeyGuard,
    CATALOG_REFRESH_API_KEY_CONFIG,
    JwtTokenService,
    OwnershipService,
    SuperadminBootstrapService,
  ],
})
export class AuthModule {}
