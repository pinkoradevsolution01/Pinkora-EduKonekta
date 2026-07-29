import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleCode } from '@prisma/client';
import { AuthService } from './auth.service';
import { AuthenticatedRequest } from './auth.types';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const session = await this.auth.authenticate(request.headers.cookie);
    if (!session) throw new UnauthorizedException('Authentication required');
    request.auth = session;
    return true;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<RoleCode[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.auth || !required.some((role) => request.auth?.roles.includes(role))) {
      throw new ForbiddenException('Insufficient role');
    }
    return true;
  }
}

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const requestedSchool =
      request.header('x-school-id') ?? (request.params as { schoolId?: string }).schoolId;
    if (
      requestedSchool &&
      request.auth?.schoolId !== requestedSchool &&
      !request.auth?.roles.includes(RoleCode.PLATFORM_ADMIN)
    ) {
      throw new ForbiddenException('Cross-school access is forbidden');
    }
    return true;
  }
}
