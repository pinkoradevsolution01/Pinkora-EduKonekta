import { ForbiddenException, Injectable } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { AuthContext } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
@Injectable()
export class AdminDashboardService {
  constructor(private p: PrismaService) {}
  private school(a: AuthContext) {
    if (
      !a.schoolId ||
      !a.roles.some((r) => r === RoleCode.SCHOOL_ADMIN || r === RoleCode.PLATFORM_ADMIN)
    )
      throw new ForbiddenException('School administration access required');
    return a.schoolId;
  }
  async metrics(a: AuthContext, from?: Date, to?: Date) {
    const s = this.school(a);
    const date = from || to ? { createdAt: { gte: from, lte: to } } : {};
    const [
      activeUsers,
      classes,
      enrollments,
      attendance,
      assignments,
      submissions,
      announcements,
      reads,
      acks,
      safety,
      guidance,
    ] = await Promise.all([
      this.p.schoolMembership.count({ where: { schoolId: s, isActive: true } }),
      this.p.class.count({ where: { schoolId: s } }),
      this.p.enrollment.count({ where: { schoolId: s, status: 'ACTIVE' } }),
      this.p.attendanceRecord.groupBy({
        by: ['state'],
        where: { schoolId: s },
        _count: { _all: true },
      }),
      this.p.assignment.count({ where: { schoolId: s, ...date } }),
      this.p.submission.count({ where: { schoolId: s, ...date } }),
      this.p.announcement.count({ where: { schoolId: s, ...date } }),
      this.p.announcementRead.count({ where: { announcement: { schoolId: s } } }),
      this.p.announcementAcknowledgement.count({ where: { announcement: { schoolId: s } } }),
      this.p.safetyReport.groupBy({
        by: ['status'],
        where: { schoolId: s },
        _count: { _all: true },
      }),
      this.p.guidanceCase.groupBy({
        by: ['status'],
        where: { schoolId: s },
        _count: { _all: true },
      }),
    ]);
    return {
      activeUsers,
      classes,
      enrollments,
      attendance,
      assignmentCompletion: { assignments, submissions },
      announcementReach: { announcements, reads, parentAcknowledgements: acks },
      safetyTotals: safety.map((x) => ({ status: x.status, total: x._count._all })),
      guidanceTotals: guidance.map((x) => ({ status: x.status, total: x._count._all })),
    };
  }
  async report(a: AuthContext, kind: string) {
    const s = this.school(a);
    if (kind === 'attendance')
      return this.p.attendanceRecord.findMany({
        where: { schoolId: s },
        select: { classId: true, attendanceDate: true, state: true },
        take: 5000,
      });
    if (kind === 'assignments')
      return this.p.assignment.findMany({
        where: { schoolId: s },
        select: {
          id: true,
          title: true,
          state: true,
          dueAt: true,
          _count: { select: { submissions: true } },
        },
        take: 5000,
      });
    if (kind === 'users')
      return this.p.schoolMembership.findMany({
        where: { schoolId: s },
        select: { isActive: true, joinedAt: true, role: { select: { code: true } } },
        take: 5000,
      });
    if (kind === 'audit')
      return this.p.auditLog.findMany({
        where: { schoolId: s },
        select: { action: true, entityType: true, createdAt: true },
        take: 5000,
      });
    throw new ForbiddenException('Unsupported report');
  }
}
