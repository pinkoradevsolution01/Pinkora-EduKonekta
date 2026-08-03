import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { AuthGuard, RolesGuard, TenantGuard } from '../auth/auth.guards';
import { Roles } from '../auth/decorators';
import { AuthenticatedRequest } from '../auth/auth.types';
import { AdminDashboardService } from './admin-dashboard.service';
@Controller({ path: 'dashboard/admin', version: '1' })
@UseGuards(AuthGuard, TenantGuard, RolesGuard)
@Roles(RoleCode.SCHOOL_ADMIN, RoleCode.PLATFORM_ADMIN)
export class AdminDashboardController {
  constructor(private s: AdminDashboardService) {}
  @Get() metrics(
    @Req() r: AuthenticatedRequest,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.s.metrics(
      r.auth!,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }
  @Get('reports') report(@Req() r: AuthenticatedRequest, @Query('kind') kind = 'attendance') {
    return this.s.report(r.auth!, kind);
  }
}
