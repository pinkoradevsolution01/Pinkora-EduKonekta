import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { AuthGuard, RolesGuard, TenantGuard } from '../auth/auth.guards';
import { Roles } from '../auth/decorators';
import { AuthenticatedRequest } from '../auth/auth.types';
import { createSafetyReportSchema, updateSafetyReportSchema } from './safety.schemas';
import { SafetyService } from './safety.service';

@Controller({ path: 'safety', version: '1' })
@UseGuards(AuthGuard, TenantGuard)
export class SafetyController {
  constructor(private readonly safety: SafetyService) {}
  @Post('reports')
  submit(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.safety.submit(req.auth!, createSafetyReportSchema.parse(body));
  }
  @Get('reports/mine')
  mine(@Req() req: AuthenticatedRequest) {
    return this.safety.mine(req.auth!);
  }
  @Get('intake/reports')
  @Roles(RoleCode.GUIDANCE)
  @UseGuards(RolesGuard)
  intake(@Req() req: AuthenticatedRequest) {
    return this.safety.intake(req.auth!);
  }
  @Get('intake/reports/:id')
  @Roles(RoleCode.GUIDANCE)
  @UseGuards(RolesGuard)
  report(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.safety.intake(req.auth!, id);
  }
  @Patch('intake/reports/:id')
  @Roles(RoleCode.GUIDANCE)
  @UseGuards(RolesGuard)
  update(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.safety.update(req.auth!, id, updateSafetyReportSchema.parse(body));
  }
  @Post('intake/reports/:id/evidence/sign')
  @Roles(RoleCode.GUIDANCE)
  @UseGuards(RolesGuard)
  signEvidence(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.safety.signedEvidence(req.auth!, id);
  }
  @Get('reports/:id/evidence')
  @Roles(RoleCode.GUIDANCE)
  @UseGuards(RolesGuard)
  evidence(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Query('token') token = '') {
    return this.safety.evidence(req.auth!, id, token);
  }
}
