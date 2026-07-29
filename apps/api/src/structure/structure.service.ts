import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RoleCode } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthContext } from '../auth/auth.types';
import { AuditLogRepository } from '../database/repositories/audit-log.repository';
import {
  AssignmentInput,
  ClassInput,
  EnrollmentInput,
  ParentLinkInput,
  ProfileInput,
  SchoolYearInput,
  SubjectInput,
} from './structure.schemas';

@Injectable()
export class StructureService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogRepository,
  ) {}

  private school(schoolId: string | null): string {
    if (!schoolId) throw new ForbiddenException('A school tenant is required');
    return schoolId;
  }

  private async auditChange(
    action: string,
    actor: AuthContext,
    entityId: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    await this.prisma.auditLog.create({
      data: {
        schoolId: this.school(actor.schoolId),
        actorUserId: actor.userId,
        action,
        entityType: 'school_structure',
        entityId,
        metadata,
      },
    });
  }

  private async assertSchoolRecords(
    schoolId: string,
    records: Array<{ id: string; schoolId: string }>,
  ) {
    if (records.some((record) => record.schoolId !== schoolId))
      throw new ForbiddenException('Cross-school identifier rejected');
  }

  async createSchoolYear(actor: AuthContext, input: SchoolYearInput) {
    const schoolId = this.school(actor.schoolId);
    try {
      const item = await this.prisma.schoolYear.create({ data: { schoolId, ...input } });
      await this.auditChange('SCHOOL_YEAR_CREATED', actor, item.id);
      return item;
    } catch (error) {
      this.rethrowConflict(error);
    }
  }

  async createClass(actor: AuthContext, input: ClassInput) {
    const schoolId = this.school(actor.schoolId);
    const year = await this.prisma.schoolYear.findUnique({ where: { id: input.schoolYearId } });
    if (!year) throw new NotFoundException('School year not found');
    await this.assertSchoolRecords(schoolId, [year]);
    try {
      const item = await this.prisma.class.create({
        data: {
          schoolId,
          schoolYearId: input.schoolYearId,
          name: input.name,
          gradeLevel: input.gradeLevel,
        },
      });
      await this.auditChange('CLASS_CREATED', actor, item.id);
      return item;
    } catch (error) {
      this.rethrowConflict(error);
    }
  }

  async createSubject(actor: AuthContext, input: SubjectInput) {
    const schoolId = this.school(actor.schoolId);
    try {
      const item = await this.prisma.subject.create({ data: { schoolId, ...input } });
      await this.auditChange('SUBJECT_CREATED', actor, item.id);
      return item;
    } catch (error) {
      this.rethrowConflict(error);
    }
  }

  async createStudentProfile(actor: AuthContext, input: ProfileInput) {
    const schoolId = this.school(actor.schoolId);
    await this.assertMember(schoolId, input.userId, RoleCode.STUDENT);
    try {
      const item = await this.prisma.studentProfile.create({
        data: { schoolId, userId: input.userId, studentNumber: input.studentNumber },
      });
      await this.auditChange('STUDENT_PROFILE_CREATED', actor, item.id);
      return item;
    } catch (error) {
      this.rethrowConflict(error);
    }
  }

  async createTeacherProfile(actor: AuthContext, input: ProfileInput) {
    const schoolId = this.school(actor.schoolId);
    await this.assertMember(schoolId, input.userId, RoleCode.TEACHER);
    try {
      const item = await this.prisma.teacherProfile.create({
        data: { schoolId, userId: input.userId, employeeNumber: input.employeeNumber },
      });
      await this.auditChange('TEACHER_PROFILE_CREATED', actor, item.id);
      return item;
    } catch (error) {
      this.rethrowConflict(error);
    }
  }

  async createParentProfile(actor: AuthContext, input: ProfileInput) {
    const schoolId = this.school(actor.schoolId);
    await this.assertMember(schoolId, input.userId, RoleCode.PARENT);
    try {
      const item = await this.prisma.parentProfile.create({
        data: { schoolId, userId: input.userId },
      });
      await this.auditChange('PARENT_PROFILE_CREATED', actor, item.id);
      return item;
    } catch (error) {
      this.rethrowConflict(error);
    }
  }

  private async assertMember(schoolId: string, userId: string, role: RoleCode) {
    const membership = await this.prisma.schoolMembership.findFirst({
      where: { schoolId, userId, isActive: true, role: { code: role } },
    });
    if (!membership)
      throw new ForbiddenException('User is not an active member with the required role');
  }

  async enroll(actor: AuthContext, input: EnrollmentInput) {
    const schoolId = this.school(actor.schoolId);
    const [year, classroom, student] = await Promise.all([
      this.prisma.schoolYear.findUnique({ where: { id: input.schoolYearId } }),
      this.prisma.class.findUnique({ where: { id: input.classId } }),
      this.prisma.studentProfile.findUnique({ where: { id: input.studentProfileId } }),
    ]);
    if (!year || !classroom || !student) throw new NotFoundException('Enrollment record not found');
    await this.assertSchoolRecords(schoolId, [year, classroom, student]);
    if (classroom.schoolYearId !== year.id)
      throw new ForbiddenException('Class does not belong to school year');
    try {
      const item = await this.prisma.enrollment.create({
        data: { schoolId, schoolYearId: year.id, classId: classroom.id, studentId: student.id },
      });
      await this.auditChange('STUDENT_ENROLLED', actor, item.id, {
        classId: classroom.id,
        studentId: student.id,
      });
      return item;
    } catch (error) {
      this.rethrowConflict(error);
    }
  }

  async assignTeacher(actor: AuthContext, input: AssignmentInput) {
    const schoolId = this.school(actor.schoolId);
    const [classroom, subject, teacher] = await Promise.all([
      this.prisma.class.findUnique({ where: { id: input.classId } }),
      this.prisma.subject.findUnique({ where: { id: input.subjectId } }),
      this.prisma.teacherProfile.findUnique({ where: { id: input.teacherProfileId } }),
    ]);
    if (!classroom || !subject || !teacher)
      throw new NotFoundException('Assignment record not found');
    await this.assertSchoolRecords(schoolId, [classroom, subject, teacher]);
    try {
      const item = await this.prisma.teacherAssignment.create({
        data: { schoolId, classId: classroom.id, subjectId: subject.id, teacherId: teacher.id },
      });
      await this.auditChange('TEACHER_ASSIGNED', actor, item.id, {
        classId: classroom.id,
        teacherId: teacher.id,
      });
      return item;
    } catch (error) {
      this.rethrowConflict(error);
    }
  }

  async linkParent(actor: AuthContext, input: ParentLinkInput) {
    const schoolId = this.school(actor.schoolId);
    const [parent, student] = await Promise.all([
      this.prisma.parentProfile.findUnique({ where: { id: input.parentProfileId } }),
      this.prisma.studentProfile.findUnique({ where: { id: input.studentProfileId } }),
    ]);
    if (!parent || !student) throw new NotFoundException('Parent or student profile not found');
    await this.assertSchoolRecords(schoolId, [parent, student]);
    try {
      const item = await this.prisma.parentStudentLink.create({
        data: {
          schoolId,
          parentId: parent.id,
          studentId: student.id,
          status: 'APPROVED',
          approvedByUserId: actor.userId,
          approvedAt: new Date(),
        },
      });
      await this.auditChange('PARENT_STUDENT_LINK_APPROVED', actor, item.id, {
        parentId: parent.id,
        studentId: student.id,
      });
      return item;
    } catch (error) {
      this.rethrowConflict(error);
    }
  }

  async teacherClasses(actor: AuthContext) {
    const schoolId = this.school(actor.schoolId);
    return this.prisma.class.findMany({
      where: { schoolId, assignments: { some: { teacher: { userId: actor.userId }, schoolId } } },
      include: { schoolYear: true, assignments: { include: { subject: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async classForTeacher(actor: AuthContext, classId: string) {
    const schoolId = this.school(actor.schoolId);
    const classroom = await this.prisma.class.findFirst({
      where: {
        id: classId,
        schoolId,
        assignments: { some: { schoolId, teacher: { userId: actor.userId } } },
      },
      include: { enrollments: { include: { student: { include: { user: true } } } } },
    });
    if (!classroom) throw new ForbiddenException('Class is not assigned to this teacher');
    return classroom;
  }

  async linkedChildren(actor: AuthContext) {
    const schoolId = this.school(actor.schoolId);
    const parent = await this.prisma.parentProfile.findFirst({
      where: { schoolId, userId: actor.userId },
    });
    if (!parent) throw new ForbiddenException('Parent profile not found');
    return this.prisma.parentStudentLink.findMany({
      where: { schoolId, parentId: parent.id, status: 'APPROVED' },
      include: {
        student: {
          include: { user: true, enrollments: { include: { class: true, schoolYear: true } } },
        },
      },
    });
  }

  async validateBulkEnrollments(actor: AuthContext, rows: EnrollmentInput[]) {
    const schoolId = this.school(actor.schoolId);
    const errors: Array<{ index: number; message: string }> = [];
    const seen = new Set<string>();
    for (const [index, row] of rows.entries()) {
      const key = `${row.schoolYearId}:${row.studentProfileId}`;
      if (seen.has(key)) errors.push({ index, message: 'Duplicate enrollment in import' });
      seen.add(key);
      const [year, classroom, student] = await Promise.all([
        this.prisma.schoolYear.findUnique({ where: { id: row.schoolYearId } }),
        this.prisma.class.findUnique({ where: { id: row.classId } }),
        this.prisma.studentProfile.findUnique({ where: { id: row.studentProfileId } }),
      ]);
      if (
        !year ||
        !classroom ||
        !student ||
        [year, classroom, student].some((item) => item.schoolId !== schoolId) ||
        classroom?.schoolYearId !== year?.id
      )
        errors.push({ index, message: 'Unknown or cross-school identifier' });
    }
    return { valid: errors.length === 0, errors, rows: rows.length };
  }

  private rethrowConflict(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
      throw new ConflictException('Duplicate record');
    throw error;
  }
}
