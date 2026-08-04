import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AssignmentState, RoleCode } from '@prisma/client';
import { Response } from 'express';
import { AuthGuard, RolesGuard, TenantGuard } from '../auth/auth.guards';
import { Roles } from '../auth/decorators';
import { AuthenticatedRequest } from '../auth/auth.types';
import {
  assignmentSchema,
  attachmentUploadSchema,
  feedbackSchema,
  submissionSchema,
} from './assignments.schemas';
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
  @Post(':id/attachment')
  @Roles(RoleCode.TEACHER, RoleCode.SCHOOL_ADMIN, RoleCode.PLATFORM_ADMIN)
  @UseGuards(RolesGuard)
  uploadAssignmentAttachment(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.assignments.uploadAssignmentAttachment(
      req.auth!,
      id,
      attachmentUploadSchema.parse(body),
    );
  }
  @Delete(':id/attachment')
  @Roles(RoleCode.TEACHER, RoleCode.SCHOOL_ADMIN, RoleCode.PLATFORM_ADMIN)
  @UseGuards(RolesGuard)
  removeAssignmentAttachment(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.assignments.removeAssignmentAttachment(req.auth!, id);
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
  @Post('submissions/:submissionId/attachment')
  @Roles(RoleCode.STUDENT)
  @UseGuards(RolesGuard)
  uploadSubmissionAttachment(
    @Req() req: AuthenticatedRequest,
    @Param('submissionId') id: string,
    @Body() body: unknown,
  ) {
    return this.assignments.uploadSubmissionAttachment(
      req.auth!,
      id,
      attachmentUploadSchema.parse(body),
    );
  }
  @Delete('submissions/:submissionId/attachment')
  @Roles(RoleCode.STUDENT)
  @UseGuards(RolesGuard)
  removeSubmissionAttachment(@Req() req: AuthenticatedRequest, @Param('submissionId') id: string) {
    return this.assignments.removeSubmissionAttachment(req.auth!, id);
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
  async attachment(
    @Req() req: AuthenticatedRequest,
    @Param('kind') kind: 'assignment' | 'submission',
    @Param('id') id: string,
    @Query('token') token?: string,
    @Res() response?: Response,
  ) {
    const file = await this.assignments.attachment(req.auth!, kind, id, token);
    const name = (file.name ?? 'attachment').replace(/[\\"\r\n]/g, '_');
    return response!
      .set({
        'content-type': file.mime ?? 'application/octet-stream',
        'content-length': String(file.data.length),
        'content-disposition': `attachment; filename="${name}"`,
        'cache-control': 'private, no-store',
      })
      .send(file.data);
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
