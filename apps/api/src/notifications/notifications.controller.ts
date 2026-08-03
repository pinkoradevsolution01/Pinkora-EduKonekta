import { Body, Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { AuthGuard, RolesGuard, TenantGuard } from '../auth/auth.guards';
import { Roles } from '../auth/decorators';
import { AuthenticatedRequest } from '../auth/auth.types';
import { NotificationsService } from './notifications.service';
import { NotificationWorkerService } from './notification-worker.service';
import { z } from 'zod';
@Controller({ path: 'notifications', version: '1' })
@UseGuards(AuthGuard, TenantGuard)
export class NotificationsController {
  constructor(
    private s: NotificationsService,
    private worker: NotificationWorkerService,
  ) {}
  @Get() list(@Req() r: AuthenticatedRequest) {
    return this.s.list(r.auth!);
  }
  @Patch(':id/read') read(@Req() r: AuthenticatedRequest, @Param('id') id: string) {
    return this.s.read(r.auth!, id);
  }
  @Get('preferences/me') prefs(@Req() r: AuthenticatedRequest) {
    return this.s.preferences(r.auth!);
  }
  @Patch('preferences/:eventType') pref(
    @Req() r: AuthenticatedRequest,
    @Param('eventType') eventType: string,
    @Body() b: unknown,
  ) {
    const x = z.object({ inAppEnabled: z.boolean(), emailEnabled: z.boolean() }).parse(b);
    return this.s.setPreference(r.auth!, eventType, x.inAppEnabled, x.emailEnabled);
  }
  @Get('monitoring/queue') @UseGuards(RolesGuard) @Roles(RoleCode.PLATFORM_ADMIN) monitoring() {
    return this.worker.monitoring();
  }
}
