import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { BcryptPasswordHasher } from './strategies/password-hasher';
import { JwtTokenService } from './strategies/jwt-token.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { OwnershipService } from './ownership/ownership.service';

@Module({
  imports: [UsersModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, BcryptPasswordHasher, JwtTokenService, JwtAuthGuard, OwnershipService],
  exports: [AuthService, JwtAuthGuard, OwnershipService],
})
export class AuthModule {}
