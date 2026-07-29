import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard, RolesGuard, TenantGuard } from './auth.guards';
import { AuthRateLimiter } from './rate-limiter';

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, RolesGuard, TenantGuard, AuthRateLimiter],
  exports: [AuthService, AuthGuard, RolesGuard, TenantGuard],
})
export class AuthModule {}
