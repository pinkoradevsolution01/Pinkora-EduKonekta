import { ForbiddenException, Injectable } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { AuthContext } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';

export type ReportKind = 'attendance' | 'assignments' | 'users' | 'communications' | 'audit';
export type DateRange = { from?: Date; to?: Date };

@Injectable()
export class SchoolReportsService {
  constructor(private readonly prisma: PrismaService) {}
  private school(actor: AuthContext) {
    if (!actor.schoolId || !actor.roles.some((role) => role === RoleCode.SCHOOL_ADMIN || role === RoleCode.PLATFORM_ADMIN))
      throw new ForbiddenException('School administration access required');
    return actor.schoolId;
  }
  private range(field: string, dates: DateRange) { return dates.from || dates.to ? { [field]: { ...(dates.from ? { gte: dates.from } : {}), ...(dates.to ? { lte: dates.to } : {}) } } : {}; }

  async overview(actor: AuthContext, dates: DateRange = {}) {
    const schoolId = this.school(actor); const created = this.range('createdAt', dates); const attendanceDate = this.range('attendanceDate', dates);
    const [activeUsers, classes, enrollments, attendance, assignments, submitted, announcements, announcementReads, acknowledgements, safetyTotals, openGuidanceCases] = await Promise.all([
      this.prisma.schoolMembership.count({ where: { schoolId, isActive: true } }),
      this.prisma.class.count({ where: { schoolId } }),
      this.prisma.enrollment.count({ where: { schoolId, status: 'ACTIVE' } }),
      this.prisma.attendanceRecord.groupBy({ by: ['state'], where: { schoolId, ...attendanceDate }, _count: { _all: true } }),
      this.prisma.assignment.count({ where: { schoolId, ...created } }),
      this.prisma.submission.count({ where: { schoolId, ...created } }),
      this.prisma.announcement.count({ where: { schoolId, ...created } }),
      this.prisma.announcementRead.count({ where: { announcement: { schoolId, ...created } } }),
      this.prisma.announcementAcknowledgement.count({ where: { announcement: { schoolId, ...created } } }),
      this.prisma.safetyReport.groupBy({ by: ['status'], where: { schoolId, ...created }, _count: { _all: true } }),
      this.prisma.guidanceCase.count({ where: { schoolId, status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    ]);
    return {
      activeUsers, classes: { total: classes, activeEnrollments: enrollments },
      attendance: attendance.map((item) => ({ state: item.state, total: item._count._all })),
      assignmentCompletion: { assignments, submitted, pending: Math.max(0, assignments - submitted) },
      announcementReach: { announcements, reads: announcementReads, parentAcknowledgements: acknowledgements },
      // Aggregates only: no reporter IDs, categories, locations, or case IDs are exposed.
      safetyTotals: safetyTotals.map((item) => ({ status: item.status, total: item._count._all })),
      openGuidanceCases,
    };
  }

  async report(actor: AuthContext, kind: ReportKind, dates: DateRange = {}, limit = 250) {
    const schoolId = this.school(actor); const take = Math.min(Math.max(limit, 1), 1000); const created = this.range('createdAt', dates); const attendanceDate = this.range('attendanceDate', dates);
    switch (kind) {
      case 'attendance': return this.prisma.attendanceRecord.findMany({ where: { schoolId, ...attendanceDate }, select: { attendanceDate: true, state: true, class: { select: { id: true, name: true } } }, orderBy: [{ attendanceDate: 'desc' }, { classId: 'asc' }], take });
      case 'assignments': return this.prisma.assignment.findMany({ where: { schoolId, ...created }, select: { id: true, title: true, state: true, dueAt: true, class: { select: { name: true } }, _count: { select: { submissions: true } } }, orderBy: { createdAt: 'desc' }, take });
      case 'users': return this.prisma.schoolMembership.findMany({ where: { schoolId, ...this.range('joinedAt', dates) }, select: { isActive: true, joinedAt: true, role: { select: { code: true } } }, orderBy: { joinedAt: 'desc' }, take });
      case 'communications': return Promise.all([
        this.prisma.announcement.findMany({ where: { schoolId, ...created }, select: { id: true, createdAt: true, _count: { select: { reads: true, acknowledgements: true } } }, orderBy: { createdAt: 'desc' }, take }),
        this.prisma.message.groupBy({ by: ['conversationId'], where: { schoolId, ...created }, _count: { _all: true }, orderBy: { _count: { conversationId: 'desc' } }, take }),
      ]).then(([announcements, conversations]) => ({ announcements, conversationMessageTotals: conversations }));
      case 'audit': return this.prisma.auditLog.findMany({ where: { schoolId, ...created }, select: { action: true, entityType: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take });
    }
  }

  async export(actor: AuthContext, kind: ReportKind, dates: DateRange = {}) {
    const data = await this.report(actor, kind, dates, 1000);
    const rows = Array.isArray(data) ? data : [data];
    // JSON export is intentional: it preserves aggregate-only safety analytics and avoids spreadsheet formula injection.
    return { fileName: `${kind}-report.json`, contentType: 'application/json', content: JSON.stringify(rows) };
  }
}
