import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { AuthenticatedRequest } from '../auth/auth.types';
import { AuthGuard, RolesGuard, TenantGuard } from '../auth/auth.guards';
import { Roles } from '../auth/decorators';
import { createInvitationSchema, createSchoolSchema } from './schools.schemas';
import { SchoolsService } from './schools.service';
@Controller({ path: 'schools', version: '1' })
@UseGuards(AuthGuard, TenantGuard, RolesGuard)
export class SchoolsController {
  constructor(private readonly schools: SchoolsService) {}
  @Post() @Roles(RoleCode.PLATFORM_ADMIN) create(
    @Req() r: AuthenticatedRequest,
    @Body() b: unknown,
  ) {
    return this.schools.create(r.auth!, createSchoolSchema.parse(b));
  }
  @Post('invitations') @Roles(RoleCode.SCHOOL_ADMIN, RoleCode.PLATFORM_ADMIN) invite(
    @Req() r: AuthenticatedRequest,
    @Body() b: unknown,
  ) {
    return this.schools.invite(r.auth!, createInvitationSchema.parse(b));
  }
}
