import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { AuthGuard, RolesGuard, TenantGuard } from '../auth/auth.guards';
import { Roles } from '../auth/decorators';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { ParentDashboardService } from './parent-dashboard.service';

@Controller({ path: 'dashboard', version: '1' })
@UseGuards(AuthGuard, TenantGuard)
export class ParentDashboardController {
  constructor(private readonly dashboard: ParentDashboardService) {}
  @Get('parent')
  @Roles(RoleCode.PARENT)
  @UseGuards(RolesGuard)
  parent(@Req() req: AuthenticatedRequest) {
    return this.dashboard.parent(req.auth!);
  }
}
