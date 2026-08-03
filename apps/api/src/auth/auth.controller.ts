import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { RoleCode, UserStatus } from '@prisma/client';
import { AuthService } from './auth.service';
import { AuthGuard, RolesGuard, TenantGuard } from './auth.guards';
import { AuthenticatedRequest } from './auth.types';
import {
  loginSchema,
  recoveryRequestSchema,
  redeemInvitationSchema,
  statusSchema,
  tokenSchema,
} from './auth.schemas';
import { Roles, TenantScoped } from './decorators';

@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login') login(@Body() body: unknown, @Res({ passthrough: true }) response: Response) {
    return this.auth.login(loginSchema.parse(body), response);
  }
  @Post('invitations/redeem') redeem(
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.auth.redeemInvitation(redeemInvitationSchema.parse(body), response);
  }
  @Post('logout') logout(
    @Headers('cookie') cookie: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.auth.logout(cookie, response);
  }
  @Post('recovery/request') recovery(@Body() body: unknown) {
    return this.auth.requestRecovery(recoveryRequestSchema.parse(body).email);
  }
  @Post('recovery/reset') reset(@Body() body: unknown) {
    const data = tokenSchema
      .extend({ password: redeemInvitationSchema.shape.password })
      .parse(body);
    return this.auth.resetPassword(data.token, data.password);
  }
  @Post('email/verify') verifyEmail(@Body() body: unknown) {
    return this.auth.verifyEmail(tokenSchema.parse(body).token);
  }

  @Get('me') @UseGuards(AuthGuard) me(@Req() request: AuthenticatedRequest) {
    return request.auth;
  }

  @Get('users')
  @Roles(RoleCode.SCHOOL_ADMIN, RoleCode.PLATFORM_ADMIN)
  @UseGuards(AuthGuard, RolesGuard, TenantGuard)
  users(@Req() request: AuthenticatedRequest) {
    return this.auth.users(request.auth!);
  }

  @Post('email/request-verification')
  @UseGuards(AuthGuard)
  requestVerification(@Req() request: AuthenticatedRequest) {
    return this.auth.requestEmailVerification(request.auth!.userId, request.auth!.schoolId);
  }

  @Patch('users/:userId/status')
  @Roles(RoleCode.SCHOOL_ADMIN, RoleCode.PLATFORM_ADMIN)
  @TenantScoped()
  @UseGuards(AuthGuard, RolesGuard, TenantGuard)
  status(
    @Req() request: AuthenticatedRequest,
    @Param('userId') userId: string,
    @Body() body: unknown,
  ) {
    return this.auth.updateStatus(
      request.auth!,
      userId,
      statusSchema.parse(body).status as UserStatus,
    );
  }
}
