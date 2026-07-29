import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { AuthGuard, RolesGuard, TenantGuard } from '../auth/auth.guards';
import { Roles } from '../auth/decorators';
import { AuthenticatedRequest } from '../auth/auth.types';
import { EvaluationsService } from './evaluations.service';
import {
  evaluationCreateSchema,
  evaluationQuerySchema,
  evaluationUpdateSchema,
} from './evaluations.schemas';

@Controller({ path: 'evaluations', version: '1' })
@UseGuards(AuthGuard, TenantGuard)
export class EvaluationsController {
  constructor(private readonly evaluations: EvaluationsService) {}

  @Get()
  @Roles(
    RoleCode.STUDENT,
    RoleCode.TEACHER,
    RoleCode.PARENT,
    RoleCode.SCHOOL_ADMIN,
    RoleCode.PLATFORM_ADMIN,
  )
  @UseGuards(RolesGuard)
  list(@Req() req: AuthenticatedRequest, @Query() query: unknown) {
    return this.evaluations.list(req.auth!, evaluationQuerySchema.parse(query));
  }

  @Get('summary')
  @Roles(
    RoleCode.STUDENT,
    RoleCode.TEACHER,
    RoleCode.PARENT,
    RoleCode.SCHOOL_ADMIN,
    RoleCode.PLATFORM_ADMIN,
  )
  @UseGuards(RolesGuard)
  summary(@Req() req: AuthenticatedRequest, @Query() query: unknown) {
    return this.evaluations.summary(req.auth!, evaluationQuerySchema.parse(query));
  }

  @Get('manageable-students')
  @Roles(RoleCode.TEACHER, RoleCode.SCHOOL_ADMIN, RoleCode.PLATFORM_ADMIN)
  @UseGuards(RolesGuard)
  manageableStudents(@Req() req: AuthenticatedRequest) {
    return this.evaluations.manageableStudents(req.auth!);
  }

  @Post()
  @Roles(RoleCode.TEACHER, RoleCode.SCHOOL_ADMIN, RoleCode.PLATFORM_ADMIN)
  @UseGuards(RolesGuard)
  create(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.evaluations.create(req.auth!, evaluationCreateSchema.parse(body));
  }

  @Patch(':id')
  @Roles(RoleCode.TEACHER, RoleCode.SCHOOL_ADMIN, RoleCode.PLATFORM_ADMIN)
  @UseGuards(RolesGuard)
  update(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.evaluations.update(req.auth!, id, evaluationUpdateSchema.parse(body));
  }

  @Post(':id/acknowledge')
  @Roles(RoleCode.PARENT)
  @UseGuards(RolesGuard)
  acknowledge(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.evaluations.acknowledge(req.auth!, id);
  }

  @Get(':id/history')
  @Roles(RoleCode.TEACHER, RoleCode.SCHOOL_ADMIN, RoleCode.PLATFORM_ADMIN)
  @UseGuards(RolesGuard)
  history(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.evaluations.history(req.auth!, id);
  }
}
