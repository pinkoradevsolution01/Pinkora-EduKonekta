import { Body, Controller, Get, Param, Patch, Put, Req, UseGuards } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { AuthGuard, RolesGuard, TenantGuard } from '../auth/auth.guards';
import { Roles } from '../auth/decorators';
import { AuthenticatedRequest } from '../auth/auth.types';
import {
  featureFlagKeySchema,
  updateFeatureFlagSchema,
  updateSchoolSettingsSchema,
  updateSubscriptionSchema,
} from './admin-settings.schemas';
import { AdminSettingsService } from './admin-settings.service';

@Controller({ path: 'dashboard/admin/settings', version: '1' })
@UseGuards(AuthGuard, TenantGuard, RolesGuard)
@Roles(RoleCode.SCHOOL_ADMIN, RoleCode.PLATFORM_ADMIN)
export class AdminSettingsController {
  constructor(private readonly settings: AdminSettingsService) {}

  @Get() get(@Req() req: AuthenticatedRequest) {
    return this.settings.get(req.auth!);
  }
  @Patch('school') updateSchool(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.settings.updateSchool(req.auth!, updateSchoolSettingsSchema.parse(body));
  }
  @Put('feature-flags/:key') setFeatureFlag(
    @Req() req: AuthenticatedRequest,
    @Param('key') key: string,
    @Body() body: unknown,
  ) {
    return this.settings.setFeatureFlag(
      req.auth!,
      featureFlagKeySchema.parse(key),
      updateFeatureFlagSchema.parse(body).enabled,
    );
  }
  @Patch('subscription') @Roles(RoleCode.PLATFORM_ADMIN) updateSubscription(
    @Req() req: AuthenticatedRequest,
    @Body() body: unknown,
  ) {
    return this.settings.updateSubscription(req.auth!, updateSubscriptionSchema.parse(body));
  }
}
