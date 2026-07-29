import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { AuthGuard, RolesGuard, TenantGuard } from '../auth/auth.guards';
import { Roles } from '../auth/decorators';
import { AuthenticatedRequest } from '../auth/auth.types';
import {
  attendanceCorrectionSchema,
  attendanceQuerySchema,
  dailyAttendanceSchema,
} from './attendance.schemas';
import { AttendanceService } from './attendance.service';

@Controller({ path: 'attendance', version: '1' })
@UseGuards(AuthGuard, TenantGuard)
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}
  @Post('daily')
  @Roles(RoleCode.TEACHER, RoleCode.SCHOOL_ADMIN, RoleCode.PLATFORM_ADMIN)
  @UseGuards(RolesGuard)
  recordDaily(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.attendance.recordDaily(req.auth!, dailyAttendanceSchema.parse(body));
  }
  @Get()
  @Roles(RoleCode.TEACHER, RoleCode.SCHOOL_ADMIN, RoleCode.PLATFORM_ADMIN)
  @UseGuards(RolesGuard)
  list(@Req() req: AuthenticatedRequest, @Query() query: unknown) {
    return this.attendance.listForStaff(req.auth!, attendanceQuerySchema.parse(query));
  }
  @Patch(':id')
  @Roles(RoleCode.TEACHER, RoleCode.SCHOOL_ADMIN, RoleCode.PLATFORM_ADMIN)
  @UseGuards(RolesGuard)
  correct(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.attendance.correct(req.auth!, id, attendanceCorrectionSchema.parse(body));
  }
  @Get(':id/history')
  @Roles(RoleCode.TEACHER, RoleCode.SCHOOL_ADMIN, RoleCode.PLATFORM_ADMIN)
  @UseGuards(RolesGuard)
  history(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.attendance.history(req.auth!, id);
  }
  @Get('me')
  @Roles(RoleCode.STUDENT)
  @UseGuards(RolesGuard)
  me(@Req() req: AuthenticatedRequest, @Query() query: unknown) {
    return this.attendance.studentView(req.auth!, attendanceQuerySchema.parse(query));
  }
  @Get('children')
  @Roles(RoleCode.PARENT)
  @UseGuards(RolesGuard)
  children(@Req() req: AuthenticatedRequest, @Query() query: unknown) {
    return this.attendance.childrenView(req.auth!, attendanceQuerySchema.parse(query));
  }
}
