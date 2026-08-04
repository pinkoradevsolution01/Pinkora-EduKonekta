import { Body, Controller, Get, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { Response } from 'express';
import { AuthGuard, RolesGuard, TenantGuard } from '../auth/auth.guards';
import { Roles } from '../auth/decorators';
import { AuthenticatedRequest } from '../auth/auth.types';
import { MessagingService } from './messaging.service';
import { createConversationSchema, escalationSchema, sendMessageSchema } from './messaging.schemas';
@Controller({ path: 'messaging', version: '1' })
@UseGuards(AuthGuard, TenantGuard)
export class MessagingController {
  constructor(private readonly service: MessagingService) {}
  @Get('conversations') @Roles(RoleCode.PARENT, RoleCode.TEACHER) @UseGuards(RolesGuard) list(
    @Req() r: AuthenticatedRequest,
  ) {
    return this.service.list(r.auth!);
  }
  @Get('contacts') @Roles(RoleCode.PARENT) @UseGuards(RolesGuard) contacts(
    @Req() r: AuthenticatedRequest,
  ) {
    return this.service.contacts(r.auth!);
  }
  @Post('conversations') @Roles(RoleCode.PARENT) @UseGuards(RolesGuard) create(
    @Req() r: AuthenticatedRequest,
    @Body() b: unknown,
  ) {
    return this.service.create(r.auth!, createConversationSchema.parse(b));
  }
  @Get('conversations/:id')
  @Roles(RoleCode.PARENT, RoleCode.TEACHER, RoleCode.SCHOOL_ADMIN)
  @UseGuards(RolesGuard)
  detail(@Req() r: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.detail(r.auth!, id);
  }
  @Post('conversations/:id/messages')
  @Roles(RoleCode.PARENT, RoleCode.TEACHER)
  @UseGuards(RolesGuard)
  send(@Req() r: AuthenticatedRequest, @Param('id') id: string, @Body() b: unknown) {
    return this.service.send(r.auth!, id, sendMessageSchema.parse(b));
  }
  @Post('conversations/:id/read')
  @Roles(RoleCode.PARENT, RoleCode.TEACHER)
  @UseGuards(RolesGuard)
  read(@Req() r: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.read(r.auth!, id);
  }
  @Post('conversations/:id/report')
  @Roles(RoleCode.PARENT, RoleCode.TEACHER)
  @UseGuards(RolesGuard)
  report(@Req() r: AuthenticatedRequest, @Param('id') id: string, @Body() b: unknown) {
    return this.service.report(r.auth!, id, escalationSchema.parse(b).reason);
  }
  @Post('messages/:id/attachment/sign')
  @Roles(RoleCode.PARENT, RoleCode.TEACHER)
  @UseGuards(RolesGuard)
  signAttachment(@Req() r: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.signedAttachment(r.auth!, id);
  }
  @Get('messages/:id/attachment')
  @Roles(RoleCode.PARENT, RoleCode.TEACHER)
  @UseGuards(RolesGuard)
  attachment(
    @Req() r: AuthenticatedRequest,
    @Param('id') id: string,
    @Query('token') token?: string,
    @Res() response?: Response,
  ) {
    return this.service.attachment(r.auth!, id, token).then((file) => {
      const name = (file.name ?? 'attachment').replace(/[\\"\r\n]/g, '_');
      return response!
        .set({
          'content-type': file.mime ?? 'application/octet-stream',
          'content-length': String(file.data.length),
          'content-disposition': `attachment; filename="${name}"`,
          'cache-control': 'private, no-store',
        })
        .send(file.data);
    });
  }
  @Post('conversations/:id/archive')
  @Roles(RoleCode.PARENT, RoleCode.TEACHER)
  @UseGuards(RolesGuard)
  archive(@Req() r: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.archive(r.auth!, id);
  }
  @Post('conversations/:id/escalate')
  @Roles(RoleCode.PARENT, RoleCode.TEACHER)
  @UseGuards(RolesGuard)
  escalate(@Req() r: AuthenticatedRequest, @Param('id') id: string, @Body() b: unknown) {
    return this.service.escalate(r.auth!, id, escalationSchema.parse(b).reason);
  }
}
