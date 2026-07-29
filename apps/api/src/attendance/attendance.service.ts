import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AttendanceState, Prisma, RoleCode } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthContext } from '../auth/auth.types';
import { AuditLogRepository } from '../database/repositories/audit-log.repository';
import { EVENT_PUBLISHER, EventPublisher } from '../communications/notification-events';
import { publishAbsenceEvent } from './attendance.events';
import {
  AttendanceCorrectionInput,
  AttendanceQuery,
  DailyAttendanceInput,
} from './attendance.schemas';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogRepository,
    @Inject(EVENT_PUBLISHER) private readonly publisher: EventPublisher,
  ) {}

  private school(actor: AuthContext) {
    if (!actor.schoolId) throw new ForbiddenException('A school tenant is required');
    return actor.schoolId;
  }

  private async assertClassAccess(actor: AuthContext, classId: string) {
    const schoolId = this.school(actor);
    const classroom = await this.prisma.class.findFirst({ where: { id: classId, schoolId } });
    if (!classroom) throw new ForbiddenException('Cross-school class access is forbidden');
    if (actor.roles.includes(RoleCode.TEACHER)) {
      const assigned = await this.prisma.teacherAssignment.findFirst({
        where: { schoolId, classId, teacher: { userId: actor.userId } },
      });
      if (!assigned) throw new ForbiddenException('Class is not assigned to this teacher');
    } else if (
      !actor.roles.includes(RoleCode.SCHOOL_ADMIN) &&
      !actor.roles.includes(RoleCode.PLATFORM_ADMIN)
    ) {
      throw new ForbiddenException('Attendance staff access is required');
    }
    return classroom;
  }

  private async auditChange(
    action: string,
    actor: AuthContext,
    entityId: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    await this.prisma.auditLog.create({
      data: {
        schoolId: this.school(actor),
        actorUserId: actor.userId,
        action,
        entityType: 'attendance',
        entityId,
        metadata,
      },
    });
  }

  async recordDaily(actor: AuthContext, input: DailyAttendanceInput) {
    const schoolId = this.school(actor);
    await this.assertClassAccess(actor, input.classId);
    const studentIds = input.records.map((record) => record.studentId);
    if (new Set(studentIds).size !== studentIds.length)
      throw new ConflictException('Duplicate student in attendance sheet');
    const enrollments = await this.prisma.enrollment.findMany({
      where: { schoolId, classId: input.classId, status: 'ACTIVE', studentId: { in: studentIds } },
      select: { studentId: true },
    });
    if (enrollments.length !== studentIds.length)
      throw new ForbiddenException('Student is not enrolled in this class');
    const existing = await this.prisma.attendanceRecord.findMany({
      where: {
        schoolId,
        classId: input.classId,
        attendanceDate: input.attendanceDate,
        studentId: { in: studentIds },
      },
      select: { studentId: true },
    });
    if (existing.length)
      throw new ConflictException('Attendance already recorded for one or more students');
    const records = await this.prisma.$transaction(async (transaction) => {
      const created = [];
      for (const record of input.records) {
        const item = await transaction.attendanceRecord.create({
          data: {
            schoolId,
            classId: input.classId,
            studentId: record.studentId,
            attendanceDate: input.attendanceDate,
            state: record.state as AttendanceState,
            notes: record.notes,
            recordedByUserId: actor.userId,
          },
        });
        created.push(item);
      }
      return created;
    });
    for (const record of records) {
      await this.auditChange('ATTENDANCE_RECORDED', actor, record.id, {
        classId: input.classId,
        studentId: record.studentId,
        state: record.state,
      });
      if (record.state === AttendanceState.ABSENT) {
        const links = await this.prisma.parentStudentLink.findMany({
          where: { schoolId, studentId: record.studentId, status: 'APPROVED' },
          select: { parent: { select: { userId: true } } },
        });
        await publishAbsenceEvent(this.publisher, record.id, schoolId, {
          studentId: record.studentId,
          attendanceDate: record.attendanceDate.toISOString(),
          recipientUserIds: links.map((link) => link.parent.userId),
        });
      }
    }
    return records;
  }

  async listForStaff(actor: AuthContext, query: AttendanceQuery) {
    const schoolId = this.school(actor);
    if (query.classId) await this.assertClassAccess(actor, query.classId);
    return this.prisma.attendanceRecord.findMany({
      where: {
        schoolId,
        ...(query.classId ? { classId: query.classId } : {}),
        ...(query.attendanceDate ? { attendanceDate: query.attendanceDate } : {}),
      },
      include: {
        student: {
          select: {
            id: true,
            studentNumber: true,
            user: { select: { id: true, displayName: true } },
          },
        },
        class: true,
      },
      orderBy: [{ attendanceDate: 'desc' }, { student: { user: { displayName: 'asc' } } }],
    });
  }

  async correct(actor: AuthContext, id: string, input: AttendanceCorrectionInput) {
    const schoolId = this.school(actor);
    const current = await this.prisma.attendanceRecord.findFirst({ where: { id, schoolId } });
    if (!current) throw new NotFoundException('Attendance record not found');
    await this.assertClassAccess(actor, current.classId);
    const updated = await this.prisma.$transaction(async (transaction) => {
      const correction = await transaction.attendanceCorrection.create({
        data: {
          schoolId,
          attendanceId: id,
          previousState: current.state,
          previousNotes: current.notes,
          newState: input.state as AttendanceState,
          newNotes: input.notes,
          reason: input.reason,
          correctedByUserId: actor.userId,
        },
      });
      const record = await transaction.attendanceRecord.update({
        where: { id },
        data: { state: input.state as AttendanceState, notes: input.notes },
      });
      return { record, correction };
    });
    await this.auditChange('ATTENDANCE_CORRECTED', actor, id, {
      correctionId: updated.correction.id,
      reason: input.reason,
      from: current.state,
      to: input.state,
    });
    if (input.state === 'ABSENT' && current.state !== 'ABSENT') {
      const links = await this.prisma.parentStudentLink.findMany({
        where: { schoolId, studentId: current.studentId, status: 'APPROVED' },
        select: { parent: { select: { userId: true } } },
      });
      await publishAbsenceEvent(this.publisher, id, schoolId, {
        studentId: current.studentId,
        attendanceDate: current.attendanceDate.toISOString(),
        recipientUserIds: links.map((link) => link.parent.userId),
      });
    }
    return updated.record;
  }

  async history(actor: AuthContext, id: string) {
    const current = await this.prisma.attendanceRecord.findFirst({
      where: { id, schoolId: this.school(actor) },
    });
    if (!current) throw new NotFoundException('Attendance record not found');
    await this.assertClassAccess(actor, current.classId);
    return this.prisma.attendanceCorrection.findMany({
      where: { schoolId: current.schoolId, attendanceId: id },
      include: { correctedBy: { select: { id: true, displayName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async studentView(actor: AuthContext, query: AttendanceQuery) {
    const schoolId = this.school(actor);
    const student = await this.prisma.studentProfile.findFirst({
      where: { schoolId, userId: actor.userId },
    });
    if (!student) throw new ForbiddenException('Student profile not found');
    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        schoolId,
        studentId: student.id,
        ...(query.classId ? { classId: query.classId } : {}),
        ...(query.attendanceDate ? { attendanceDate: query.attendanceDate } : {}),
      },
      include: { class: true },
      orderBy: { attendanceDate: 'desc' },
    });
    return { records, summary: this.summarize(records) };
  }

  async childrenView(actor: AuthContext, query: AttendanceQuery) {
    const schoolId = this.school(actor);
    const parent = await this.prisma.parentProfile.findFirst({
      where: { schoolId, userId: actor.userId },
    });
    if (!parent) throw new ForbiddenException('Parent profile not found');
    const links = await this.prisma.parentStudentLink.findMany({
      where: { schoolId, parentId: parent.id, status: 'APPROVED' },
      include: {
        student: {
          select: {
            id: true,
            studentNumber: true,
            user: { select: { id: true, displayName: true } },
          },
        },
      },
    });
    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        schoolId,
        studentId: { in: links.map((link) => link.studentId) },
        ...(query.classId ? { classId: query.classId } : {}),
        ...(query.attendanceDate ? { attendanceDate: query.attendanceDate } : {}),
      },
      include: { class: true },
      orderBy: { attendanceDate: 'desc' },
    });
    return links.map((link) => {
      const childRecords = records.filter((record) => record.studentId === link.studentId);
      return {
        student: link.student,
        records: childRecords,
        summary: this.summarize(childRecords),
      };
    });
  }

  private summarize(records: Array<{ state: AttendanceState }>) {
    return records.reduce(
      (summary, record) => ({
        ...summary,
        [record.state.toLowerCase()]:
          summary[record.state.toLowerCase() as keyof typeof summary] + 1,
      }),
      { present: 0, absent: 0, late: 0, excused: 0 },
    );
  }
}
