import { BadRequestException, Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { z } from 'zod';
import { AuthGuard, RolesGuard, TenantGuard } from '../auth/auth.guards';
import { Roles } from '../auth/decorators';
import { AuthenticatedRequest } from '../auth/auth.types';
import { ReportKind, SchoolReportsService } from './school-reports.service';

const querySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(250),
});
const kinds = ['attendance', 'assignments', 'users', 'communications', 'audit'] as const;
@Controller({ path: 'dashboard/admin', version: '1' })
@UseGuards(AuthGuard, TenantGuard, RolesGuard)
@Roles(RoleCode.SCHOOL_ADMIN, RoleCode.PLATFORM_ADMIN)
export class SchoolReportsController {
  constructor(private readonly reports: SchoolReportsService) {}
  @Get('overview') overview(@Req() req: AuthenticatedRequest, @Query() query: unknown) {
    const input = querySchema.parse(query);
    return this.reports.overview(req.auth!, {
      from: input.from ? new Date(input.from) : undefined,
      to: input.to ? new Date(input.to) : undefined,
    });
  }
  @Get('reports/:kind') report(
    @Req() req: AuthenticatedRequest,
    @Param('kind') kind: string,
    @Query() query: unknown,
  ) {
    const input = querySchema.parse(query);
    if (!kinds.includes(kind as ReportKind)) throw new BadRequestException('Unsupported report');
    return this.reports.report(
      req.auth!,
      kind as ReportKind,
      {
        from: input.from ? new Date(input.from) : undefined,
        to: input.to ? new Date(input.to) : undefined,
      },
      input.limit,
    );
  }
  @Get('reports/:kind/export') export(
    @Req() req: AuthenticatedRequest,
    @Param('kind') kind: string,
    @Query() query: unknown,
  ) {
    const input = querySchema.parse(query);
    if (!kinds.includes(kind as ReportKind)) throw new BadRequestException('Unsupported report');
    return this.reports.export(req.auth!, kind as ReportKind, {
      from: input.from ? new Date(input.from) : undefined,
      to: input.to ? new Date(input.to) : undefined,
    });
  }
}
