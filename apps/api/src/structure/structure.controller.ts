import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { AuthGuard, RolesGuard, TenantGuard } from '../auth/auth.guards';
import { Roles } from '../auth/decorators';
import { AuthenticatedRequest } from '../auth/auth.types';
import {
  assignmentSchema,
  bulkEnrollmentSchema,
  classSchema,
  enrollmentSchema,
  parentLinkSchema,
  profileSchema,
  schoolYearSchema,
  subjectSchema,
} from './structure.schemas';
import { StructureService } from './structure.service';

@Controller({ path: 'structure', version: '1' })
@UseGuards(AuthGuard, TenantGuard)
export class StructureController {
  constructor(private readonly structure: StructureService) {}

  @Post('school-years')
  @Roles(RoleCode.SCHOOL_ADMIN, RoleCode.PLATFORM_ADMIN)
  @UseGuards(RolesGuard)
  createYear(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.structure.createSchoolYear(req.auth!, schoolYearSchema.parse(body));
  }
  @Post('classes')
  @Roles(RoleCode.SCHOOL_ADMIN, RoleCode.PLATFORM_ADMIN)
  @UseGuards(RolesGuard)
  createClass(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.structure.createClass(req.auth!, classSchema.parse(body));
  }
  @Post('subjects')
  @Roles(RoleCode.SCHOOL_ADMIN, RoleCode.PLATFORM_ADMIN)
  @UseGuards(RolesGuard)
  createSubject(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.structure.createSubject(req.auth!, subjectSchema.parse(body));
  }
  @Post('profiles/student')
  @Roles(RoleCode.SCHOOL_ADMIN, RoleCode.PLATFORM_ADMIN)
  @UseGuards(RolesGuard)
  studentProfile(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.structure.createStudentProfile(req.auth!, profileSchema.parse(body));
  }
  @Post('profiles/teacher')
  @Roles(RoleCode.SCHOOL_ADMIN, RoleCode.PLATFORM_ADMIN)
  @UseGuards(RolesGuard)
  teacherProfile(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.structure.createTeacherProfile(req.auth!, profileSchema.parse(body));
  }
  @Post('profiles/parent')
  @Roles(RoleCode.SCHOOL_ADMIN, RoleCode.PLATFORM_ADMIN)
  @UseGuards(RolesGuard)
  parentProfile(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.structure.createParentProfile(req.auth!, profileSchema.parse(body));
  }
  @Post('enrollments')
  @Roles(RoleCode.SCHOOL_ADMIN, RoleCode.PLATFORM_ADMIN)
  @UseGuards(RolesGuard)
  enroll(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.structure.enroll(req.auth!, enrollmentSchema.parse(body));
  }
  @Post('assignments')
  @Roles(RoleCode.SCHOOL_ADMIN, RoleCode.PLATFORM_ADMIN)
  @UseGuards(RolesGuard)
  assign(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.structure.assignTeacher(req.auth!, assignmentSchema.parse(body));
  }
  @Post('parent-links')
  @Roles(RoleCode.SCHOOL_ADMIN, RoleCode.PLATFORM_ADMIN)
  @UseGuards(RolesGuard)
  link(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.structure.linkParent(req.auth!, parentLinkSchema.parse(body));
  }
  @Post('bulk/enrollments/validate')
  @Roles(RoleCode.SCHOOL_ADMIN, RoleCode.PLATFORM_ADMIN)
  @UseGuards(RolesGuard)
  validateBulk(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.structure.validateBulkEnrollments(req.auth!, bulkEnrollmentSchema.parse(body).rows);
  }
  @Get('bulk/enrollments/template')
  @Roles(RoleCode.SCHOOL_ADMIN, RoleCode.PLATFORM_ADMIN)
  @UseGuards(RolesGuard)
  bulkTemplate() {
    return this.structure.bulkEnrollmentTemplate();
  }
  @Get('classes')
  @Roles(RoleCode.TEACHER, RoleCode.SCHOOL_ADMIN, RoleCode.PLATFORM_ADMIN)
  @UseGuards(RolesGuard)
  classes(@Req() req: AuthenticatedRequest) {
    return req.auth!.roles.includes(RoleCode.TEACHER) &&
      !req.auth!.roles.includes(RoleCode.SCHOOL_ADMIN)
      ? this.structure.teacherClasses(req.auth!)
      : this.structure.teacherClasses(req.auth!);
  }
  @Get('administration-overview')
  @Roles(RoleCode.SCHOOL_ADMIN, RoleCode.PLATFORM_ADMIN)
  @UseGuards(RolesGuard)
  administrationOverview(@Req() req: AuthenticatedRequest) {
    return this.structure.administrationOverview(req.auth!);
  }
  @Get('classes/:classId') @Roles(RoleCode.TEACHER) @UseGuards(RolesGuard) assignedClass(
    @Req() req: AuthenticatedRequest,
    @Param('classId') classId: string,
  ) {
    return this.structure.classForTeacher(req.auth!, classId);
  }
  @Get('children') @Roles(RoleCode.PARENT) @UseGuards(RolesGuard) children(
    @Req() req: AuthenticatedRequest,
  ) {
    return this.structure.linkedChildren(req.auth!);
  }
}
