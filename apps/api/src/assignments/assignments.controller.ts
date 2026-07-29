import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AssignmentState, RoleCode } from '@prisma/client';
import { AuthGuard, RolesGuard, TenantGuard } from '../auth/auth.guards';
import { Roles } from '../auth/decorators';
import { AuthenticatedRequest } from '../auth/auth.types';
import { assignmentSchema, feedbackSchema, submissionSchema } from './assignments.schemas';
import { AssignmentsService } from './assignments.service';

@Controller({ path: 'assignments', version: '1' })
@UseGuards(AuthGuard, TenantGuard)
export class AssignmentsController {
  constructor(private readonly assignments: AssignmentsService) {}
  @Post()
  @Roles(RoleCode.TEACHER, RoleCode.SCHOOL_ADMIN, RoleCode.PLATFORM_ADMIN)
  @UseGuards(RolesGuard)
  create(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.assignments.create(req.auth!, assignmentSchema.parse(body));
  }
  @Patch(':id')
  @Roles(RoleCode.TEACHER, RoleCode.SCHOOL_ADMIN, RoleCode.PLATFORM_ADMIN)
  @UseGuards(RolesGuard)
  update(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.assignments.update(req.auth!, id, assignmentSchema.parse(body));
  }
  @Post(':id/publish')
  @Roles(RoleCode.TEACHER, RoleCode.SCHOOL_ADMIN, RoleCode.PLATFORM_ADMIN)
  @UseGuards(RolesGuard)
  publish(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.assignments.changeState(req.auth!, id, AssignmentState.PUBLISHED);
  }
  @Post(':id/archive')
  @Roles(RoleCode.TEACHER, RoleCode.SCHOOL_ADMIN, RoleCode.PLATFORM_ADMIN)
  @UseGuards(RolesGuard)
  archive(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.assignments.changeState(req.auth!, id, AssignmentState.ARCHIVED);
  }
  @Get() list(@Req() req: AuthenticatedRequest) {
    return this.assignments.list(req.auth!);
  }
  @Post(':id/submissions')
  @Roles(RoleCode.STUDENT)
  @UseGuards(RolesGuard)
  submit(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.assignments.submit(req.auth!, id, submissionSchema.parse(body));
  }
  @Get(':id/submissions')
  @Roles(
    RoleCode.STUDENT,
    RoleCode.TEACHER,
    RoleCode.PARENT,
    RoleCode.SCHOOL_ADMIN,
    RoleCode.PLATFORM_ADMIN,
  )
  @UseGuards(RolesGuard)
  submissions(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.assignments.submissions(req.auth!, id);
  }
  @Patch('submissions/:submissionId/feedback')
  @Roles(RoleCode.TEACHER, RoleCode.SCHOOL_ADMIN, RoleCode.PLATFORM_ADMIN)
  @UseGuards(RolesGuard)
  feedback(
    @Req() req: AuthenticatedRequest,
    @Param('submissionId') id: string,
    @Body() body: unknown,
  ) {
    return this.assignments.feedback(req.auth!, id, feedbackSchema.parse(body));
  }
  @Get('attachments/:kind/:id')
  @Roles(
    RoleCode.STUDENT,
    RoleCode.TEACHER,
    RoleCode.PARENT,
    RoleCode.SCHOOL_ADMIN,
    RoleCode.PLATFORM_ADMIN,
  )
  @UseGuards(RolesGuard)
  attachment(
    @Req() req: AuthenticatedRequest,
    @Param('kind') kind: 'assignment' | 'submission',
    @Param('id') id: string,
    @Query('token') token?: string,
  ) {
    return this.assignments.attachment(req.auth!, kind, id, token);
  }
  @Post('attachments/:kind/:id/sign')
  @Roles(
    RoleCode.STUDENT,
    RoleCode.TEACHER,
    RoleCode.PARENT,
    RoleCode.SCHOOL_ADMIN,
    RoleCode.PLATFORM_ADMIN,
  )
  @UseGuards(RolesGuard)
  sign(
    @Req() req: AuthenticatedRequest,
    @Param('kind') kind: 'assignment' | 'submission',
    @Param('id') id: string,
  ) {
    return this.assignments.signedAttachment(req.auth!, kind, id);
  }
}
